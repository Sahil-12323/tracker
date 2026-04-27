from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response
from dotenv import load_dotenv
from fastapi.responses import HTMLResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import asyncio
import base64
import json
import re
import warnings

import jwt
import requests
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = "HS256"
TOKEN_DAYS = 7
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
APPLICATION_STATUSES = ["Applied", "Screening", "Interview", "Offer", "Rejected"]
SOURCES = ["manual", "email", "share", "screenshot"]
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]
EMAIL_KEYWORDS = ["application received", "you applied", "thank you for applying"]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class UserOut(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    auth_provider: str = "email"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class ApplicationIn(BaseModel):
    company_name: str = Field(min_length=1)
    role: str = Field(min_length=1)
    status: str = "Applied"
    applied_date: str
    job_link: Optional[str] = ""
    notes: Optional[str] = ""
    resume_version: Optional[str] = ""
    follow_up_date: Optional[str] = ""
    source: str = "manual"


class ApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    applied_date: Optional[str] = None
    job_link: Optional[str] = None
    notes: Optional[str] = None
    resume_version: Optional[str] = None
    follow_up_date: Optional[str] = None
    source: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class ApplicationOut(ApplicationIn):
    id: str
    user_id: str
    created_at: str
    updated_at: str


class DetectionParseRequest(BaseModel):
    source: str
    text: str = Field(min_length=1)
    image_base64: Optional[str] = None


class DetectionOut(BaseModel):
    id: str
    user_id: str
    source: str
    company_name: str
    role: str
    status: str = "Applied"
    applied_date: str
    job_link: str = ""
    notes: str = ""
    resume_version: str = ""
    follow_up_date: str = ""
    confidence: float = 0.55
    raw_text_preview: str
    state: str = "pending"
    ai_available: bool = False
    config_message: str = ""
    created_at: str


class AnalyticsOut(BaseModel):
    total: int
    active: int
    interviews: int
    offers: int
    rejected: int
    success_rate: float
    by_status: Dict[str, int]
    by_resume: Dict[str, int]
    upcoming_followups: int


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sanitize(doc: Dict[str, Any]) -> Dict[str, Any]:
    clean = {k: v for k, v in doc.items() if k != "_id"}
    for key, value in list(clean.items()):
        if isinstance(value, datetime):
            clean[key] = value.replace(tzinfo=timezone.utc).isoformat()
    return clean


def validate_status(status: str) -> str:
    normalized = status.strip().title()
    if normalized not in APPLICATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid application status")
    return normalized


def validate_source(source: str) -> str:
    normalized = source.strip().lower()
    if normalized not in SOURCES:
        raise HTTPException(status_code=400, detail="Invalid application source")
    return normalized


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> UserOut:
    token = None
    auth = request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1]
    token = token or request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return UserOut(**user)


def public_base_url(request: Request) -> str:
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    proto = request.headers.get("x-forwarded-proto") or "https"
    return f"{proto}://{host}" if host else str(request.base_url).rstrip("/")


def oauth_redirect_uri(request: Request) -> str:
    return f"{public_base_url(request)}/api/gmail/callback"


def gmail_configured() -> bool:
    return bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))


def grok_configured() -> bool:
    return bool(os.getenv("GROK_API_KEY"))


def fallback_extract(text: str, source: str) -> Dict[str, Any]:
    compact = " ".join(text.split())[:4000]
    company = "Unknown Company"
    role = "Unknown Role"
    date_match = re.search(r"(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d{2})", compact)
    role_company = re.search(r"(?P<role>[A-Z][\w\s/&+.-]{2,70})\s+(?:at|@)\s+(?P<company>[A-Z][\w\s&+.-]{2,60})", compact)
    applied_to = re.search(r"(?:applying to|application (?:for|to)|applied to)\s+(?P<company>[A-Z][\w\s&+.-]{2,60})", compact, re.I)
    dash_line = re.search(r"(?P<company>[A-Z][\w\s&+.-]{2,45})\s+[-–—]\s+(?P<role>[A-Z][\w\s/&+.-]{2,70})", compact)
    if role_company:
        role = role_company.group("role").strip()
        company = role_company.group("company").strip()
    elif dash_line:
        company = dash_line.group("company").strip()
        role = dash_line.group("role").strip()
    elif applied_to:
        company = applied_to.group("company").strip()
    company = re.split(r"\b(Thank you|Application|Applied on|We received|We have received)\b", company, flags=re.I)[0].strip(" -–—,.") or company
    role = re.split(r"\b(Thank you|Application|Applied on|We received|We have received)\b", role, flags=re.I)[0].strip(" -–—,.") or role
    job_link = ""
    link = re.search(r"https?://[^\s)]+", compact)
    if link:
        job_link = link.group(0).rstrip(".,")
    status = "Applied"
    lowered = compact.lower()
    if "interview" in lowered:
        status = "Interview"
    elif "screen" in lowered or "assessment" in lowered:
        status = "Screening"
    elif "offer" in lowered:
        status = "Offer"
    elif "unfortunately" in lowered or "not moving forward" in lowered:
        status = "Rejected"
    return {
        "company_name": company[:80],
        "role": role[:90],
        "status": status,
        "applied_date": (date_match.group(1).replace("/", "-") if date_match else datetime.now(timezone.utc).date().isoformat()),
        "job_link": job_link,
        "notes": f"Detected from {source}. Review before adding.",
        "confidence": 0.52 if company.startswith("Unknown") or role.startswith("Unknown") else 0.72,
        "ai_available": False,
        "config_message": "Grok key not configured; used privacy-safe rule parser.",
    }


async def grok_extract(text: str, source: str) -> Dict[str, Any]:
    if not grok_configured():
        return fallback_extract(text, source)
    prompt = (
        "Extract job application data from the text. Return JSON only with keys: "
        "company_name, role, status, applied_date, job_link, notes, confidence. "
        "status must be one of Applied, Screening, Interview, Offer, Rejected. "
        "Use YYYY-MM-DD for dates. Text:\n" + text[:8000]
    )
    payload = {
        "model": os.getenv("GROK_MODEL", "grok-4-latest"),
        "messages": [
            {"role": "system", "content": "You return compact valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {os.getenv('GROK_API_KEY')}", "Content-Type": "application/json"}
    try:
        response = await asyncio.to_thread(
            requests.post,
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=25,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        parsed["status"] = validate_status(parsed.get("status", "Applied"))
        parsed["company_name"] = parsed.get("company_name") or "Unknown Company"
        parsed["role"] = parsed.get("role") or "Unknown Role"
        parsed["applied_date"] = parsed.get("applied_date") or datetime.now(timezone.utc).date().isoformat()
        parsed["job_link"] = parsed.get("job_link") or ""
        parsed["notes"] = parsed.get("notes") or f"Detected from {source}."
        parsed["confidence"] = float(parsed.get("confidence", 0.85))
        parsed["ai_available"] = True
        parsed["config_message"] = "Parsed with Grok."
        return parsed
    except Exception as exc:
        logging.warning("Grok parse failed: %s", exc)
        parsed = fallback_extract(text, source)
        parsed["config_message"] = "Grok call failed; used rule parser fallback."
        return parsed

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "JobTrackr AI API", "status": "ready"}


@api_router.post("/auth/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_doc = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "email": payload.email.lower(),
        "name": payload.name.strip(),
        "picture": None,
        "auth_provider": "email",
        "password_hash": pwd_context.hash(payload.password),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.insert_one(user_doc.copy())
    token = create_token(user_doc["user_id"])
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", max_age=TOKEN_DAYS * 86400)
    return AuthResponse(token=token, user=UserOut(**sanitize(user_doc)))


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash") or not pwd_context.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["user_id"])
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", max_age=TOKEN_DAYS * 86400)
    return AuthResponse(token=token, user=UserOut(**user))


@api_router.post("/auth/google/session", response_model=AuthResponse)
async def google_session(payload: GoogleSessionRequest, response: Response):
    emergent_response = await asyncio.to_thread(
        requests.get,
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": payload.session_id},
        timeout=20,
    )
    if emergent_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Google session could not be verified")
    data = emergent_response.json()
    existing = await db.users.find_one({"email": data["email"].lower()}, {"_id": 0})
    if existing:
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {"name": data.get("name") or existing["name"], "picture": data.get("picture"), "auth_provider": "google", "updated_at": now_iso()}},
        )
        user_doc = await db.users.find_one({"user_id": existing["user_id"]}, {"_id": 0})
    else:
        user_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": data["email"].lower(),
            "name": data.get("name") or data["email"].split("@")[0],
            "picture": data.get("picture"),
            "auth_provider": "google",
            "password_hash": None,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.users.insert_one(user_doc.copy())
    await db.user_sessions.update_one(
        {"user_id": user_doc["user_id"]},
        {"$set": {"session_token": data.get("session_token"), "expires_at": now_iso(), "updated_at": now_iso()}},
        upsert=True,
    )
    token = create_token(user_doc["user_id"])
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", max_age=TOKEN_DAYS * 86400)
    return AuthResponse(token=token, user=UserOut(**user_doc))


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: UserOut = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}


@api_router.post("/applications", response_model=ApplicationOut)
async def create_application(payload: ApplicationIn, user: UserOut = Depends(get_current_user)):
    doc = payload.dict()
    doc["status"] = validate_status(doc["status"])
    doc["source"] = validate_source(doc["source"])
    doc.update({"id": f"app_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "created_at": now_iso(), "updated_at": now_iso()})
    await db.applications.insert_one(doc.copy())
    return ApplicationOut(**sanitize(doc))


@api_router.get("/applications", response_model=List[ApplicationOut])
async def list_applications(user: UserOut = Depends(get_current_user)):
    docs = await db.applications.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ApplicationOut(**doc) for doc in docs]


@api_router.put("/applications/{application_id}", response_model=ApplicationOut)
async def update_application(application_id: str, payload: ApplicationUpdate, user: UserOut = Depends(get_current_user)):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if "status" in updates:
        updates["status"] = validate_status(updates["status"])
    if "source" in updates:
        updates["source"] = validate_source(updates["source"])
    updates["updated_at"] = now_iso()
    result = await db.applications.update_one({"id": application_id, "user_id": user.user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    doc = await db.applications.find_one({"id": application_id, "user_id": user.user_id}, {"_id": 0})
    return ApplicationOut(**doc)


@api_router.patch("/applications/{application_id}/status", response_model=ApplicationOut)
async def update_application_status(application_id: str, payload: StatusUpdate, user: UserOut = Depends(get_current_user)):
    status = validate_status(payload.status)
    result = await db.applications.update_one(
        {"id": application_id, "user_id": user.user_id},
        {"$set": {"status": status, "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    doc = await db.applications.find_one({"id": application_id, "user_id": user.user_id}, {"_id": 0})
    return ApplicationOut(**doc)


@api_router.delete("/applications/{application_id}")
async def delete_application(application_id: str, user: UserOut = Depends(get_current_user)):
    result = await db.applications.delete_one({"id": application_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted"}


@api_router.get("/analytics", response_model=AnalyticsOut)
async def analytics(user: UserOut = Depends(get_current_user)):
    apps = await db.applications.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    by_status = {status: 0 for status in APPLICATION_STATUSES}
    by_resume: Dict[str, int] = {}
    upcoming_followups = 0
    today = datetime.now(timezone.utc).date()
    for app_doc in apps:
        by_status[app_doc.get("status", "Applied")] = by_status.get(app_doc.get("status", "Applied"), 0) + 1
        resume = app_doc.get("resume_version") or "Unspecified"
        by_resume[resume] = by_resume.get(resume, 0) + 1
        follow = app_doc.get("follow_up_date") or ""
        try:
            follow_date = datetime.fromisoformat(follow).date()
            if today <= follow_date <= today + timedelta(days=7):
                upcoming_followups += 1
        except Exception:
            pass
    total = len(apps)
    success_rate = round((by_status.get("Offer", 0) / total) * 100, 1) if total else 0
    active = total - by_status.get("Rejected", 0)
    return AnalyticsOut(
        total=total,
        active=active,
        interviews=by_status.get("Interview", 0),
        offers=by_status.get("Offer", 0),
        rejected=by_status.get("Rejected", 0),
        success_rate=success_rate,
        by_status=by_status,
        by_resume=by_resume,
        upcoming_followups=upcoming_followups,
    )


@api_router.get("/reminders", response_model=List[ApplicationOut])
async def reminders(user: UserOut = Depends(get_current_user)):
    apps = await db.applications.find({"user_id": user.user_id, "follow_up_date": {"$ne": ""}}, {"_id": 0}).to_list(200)
    return [ApplicationOut(**doc) for doc in apps]


@api_router.post("/detections/parse", response_model=DetectionOut)
async def parse_detection(payload: DetectionParseRequest, user: UserOut = Depends(get_current_user)):
    source = validate_source(payload.source)
    parsed = await grok_extract(payload.text, source)
    doc = {
        "id": f"det_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "source": source,
        "company_name": parsed["company_name"],
        "role": parsed["role"],
        "status": validate_status(parsed.get("status", "Applied")),
        "applied_date": parsed.get("applied_date") or datetime.now(timezone.utc).date().isoformat(),
        "job_link": parsed.get("job_link") or "",
        "notes": parsed.get("notes") or "",
        "resume_version": "",
        "follow_up_date": "",
        "confidence": min(max(float(parsed.get("confidence", 0.55)), 0), 1),
        "raw_text_preview": payload.text[:280],
        "state": "pending",
        "ai_available": bool(parsed.get("ai_available", False)),
        "config_message": parsed.get("config_message", ""),
        "created_at": now_iso(),
    }
    await db.detections.insert_one(doc.copy())
    return DetectionOut(**sanitize(doc))


@api_router.get("/detections", response_model=List[DetectionOut])
async def list_detections(user: UserOut = Depends(get_current_user)):
    docs = await db.detections.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DetectionOut(**doc) for doc in docs]


@api_router.post("/detections/{detection_id}/accept", response_model=ApplicationOut)
async def accept_detection(detection_id: str, user: UserOut = Depends(get_current_user)):
    detection = await db.detections.find_one({"id": detection_id, "user_id": user.user_id}, {"_id": 0})
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    app_payload = ApplicationIn(
        company_name=detection["company_name"],
        role=detection["role"],
        status=detection["status"],
        applied_date=detection["applied_date"],
        job_link=detection.get("job_link", ""),
        notes=detection.get("notes", ""),
        resume_version=detection.get("resume_version", ""),
        follow_up_date=detection.get("follow_up_date", ""),
        source=detection["source"],
    )
    app_doc = app_payload.dict()
    app_doc.update({"id": f"app_{uuid.uuid4().hex[:12]}", "user_id": user.user_id, "created_at": now_iso(), "updated_at": now_iso()})
    await db.applications.insert_one(app_doc.copy())
    await db.detections.update_one({"id": detection_id}, {"$set": {"state": "accepted", "updated_at": now_iso()}})
    return ApplicationOut(**sanitize(app_doc))


@api_router.post("/detections/{detection_id}/ignore")
async def ignore_detection(detection_id: str, user: UserOut = Depends(get_current_user)):
    result = await db.detections.update_one({"id": detection_id, "user_id": user.user_id}, {"$set": {"state": "ignored", "updated_at": now_iso()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Detection not found")
    return {"message": "Detection ignored"}


@api_router.get("/gmail/config")
async def gmail_config(request: Request, user: UserOut = Depends(get_current_user)):
    token = await db.gmail_tokens.find_one({"user_id": user.user_id}, {"_id": 0, "access_token": 0, "refresh_token": 0})
    return {
        "configured": gmail_configured(),
        "connected": bool(token),
        "redirect_uri": oauth_redirect_uri(request),
        "message": "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Gmail sync." if not gmail_configured() else "Gmail OAuth is ready.",
    }


@api_router.get("/gmail/connect")
async def gmail_connect(request: Request, user: UserOut = Depends(get_current_user)):
    if not gmail_configured():
        raise HTTPException(status_code=400, detail="Google OAuth credentials are not configured")
    flow = Flow.from_client_config(
        {"web": {"client_id": os.getenv("GOOGLE_CLIENT_ID"), "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"), "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token"}},
        scopes=GMAIL_SCOPES,
        redirect_uri=oauth_redirect_uri(request),
    )
    auth_url, state = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="true")
    await db.oauth_states.insert_one({"state": state, "user_id": user.user_id, "created_at": now_iso()})
    return {"auth_url": auth_url, "redirect_uri": oauth_redirect_uri(request)}


@api_router.get("/gmail/callback")
async def gmail_callback(request: Request, code: str, state: str):
    state_doc = await db.oauth_states.find_one({"state": state}, {"_id": 0})
    if not state_doc:
        return HTMLResponse("<h2>Gmail connection expired. Return to JobTrackr AI and try again.</h2>", status_code=400)
    flow = Flow.from_client_config(
        {"web": {"client_id": os.getenv("GOOGLE_CLIENT_ID"), "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"), "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token"}},
        scopes=GMAIL_SCOPES,
        redirect_uri=oauth_redirect_uri(request),
    )
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        flow.fetch_token(code=code)
    creds = flow.credentials
    expires = creds.expiry.replace(tzinfo=timezone.utc).isoformat() if creds.expiry else now_iso()
    await db.gmail_tokens.update_one(
        {"user_id": state_doc["user_id"]},
        {"$set": {"user_id": state_doc["user_id"], "access_token": creds.token, "refresh_token": creds.refresh_token, "token_uri": creds.token_uri, "client_id": creds.client_id, "client_secret": creds.client_secret, "scopes": list(creds.scopes or []), "expires_at": expires, "updated_at": now_iso()}},
        upsert=True,
    )
    await db.oauth_states.delete_one({"state": state})
    return HTMLResponse("<h2>Gmail connected. You can return to JobTrackr AI.</h2>")


async def gmail_credentials(user_id: str) -> Credentials:
    token = await db.gmail_tokens.find_one({"user_id": user_id}, {"_id": 0})
    if not token:
        raise HTTPException(status_code=400, detail="Gmail is not connected")
    creds = Credentials(
        token=token["access_token"],
        refresh_token=token.get("refresh_token"),
        token_uri=token.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token.get("client_id") or os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=token.get("client_secret") or os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=token.get("scopes") or GMAIL_SCOPES,
    )
    expires = token.get("expires_at")
    expires_dt = datetime.fromisoformat(expires) if isinstance(expires, str) else datetime.now(timezone.utc)
    if expires_dt.tzinfo is None:
        expires_dt = expires_dt.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) >= expires_dt and creds.refresh_token:
        creds.refresh(GoogleRequest())
        await db.gmail_tokens.update_one({"user_id": user_id}, {"$set": {"access_token": creds.token, "expires_at": creds.expiry.replace(tzinfo=timezone.utc).isoformat(), "updated_at": now_iso()}})
    return creds


@api_router.post("/gmail/sync", response_model=List[DetectionOut])
async def gmail_sync(user: UserOut = Depends(get_current_user)):
    if not gmail_configured():
        raise HTTPException(status_code=400, detail="Google OAuth credentials are not configured")
    creds = await gmail_credentials(user.user_id)
    service = await asyncio.to_thread(build, "gmail", "v1", credentials=creds)
    query = " OR ".join([f'"{keyword}"' for keyword in EMAIL_KEYWORDS])
    result = await asyncio.to_thread(lambda: service.users().messages().list(userId="me", q=query, maxResults=10).execute())
    detections: List[DetectionOut] = []
    for item in result.get("messages", []):
        message = await asyncio.to_thread(lambda msg_id=item["id"]: service.users().messages().get(userId="me", id=msg_id, format="full").execute())
        payload = message.get("payload", {})
        body = message.get("snippet", "")
        parts = payload.get("parts", [])
        for part in parts:
            data = part.get("body", {}).get("data")
            if data:
                body += " " + base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
        parsed = await grok_extract(body, "email")
        doc = {
            "id": f"det_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "source": "email",
            "company_name": parsed["company_name"],
            "role": parsed["role"],
            "status": validate_status(parsed.get("status", "Applied")),
            "applied_date": parsed.get("applied_date") or datetime.now(timezone.utc).date().isoformat(),
            "job_link": parsed.get("job_link") or "",
            "notes": parsed.get("notes") or "Detected from Gmail.",
            "resume_version": "",
            "follow_up_date": "",
            "confidence": min(max(float(parsed.get("confidence", 0.55)), 0), 1),
            "raw_text_preview": body[:280],
            "state": "pending",
            "ai_available": bool(parsed.get("ai_available", False)),
            "config_message": parsed.get("config_message", ""),
            "created_at": now_iso(),
        }
        await db.detections.insert_one(doc.copy())
        detections.append(DetectionOut(**sanitize(doc)))
    return detections

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
