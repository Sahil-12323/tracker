import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { IMAGES } from '../constants/assets';

const webTest = (id: string) => (Platform.OS === 'web' ? ({ 'data-testid': id } as any) : {});

const slides = [
  { image: IMAGES.onboarding1, eyebrow: 'AI DETECTION', title: 'Detect applications from email, share text, and screenshots.', body: 'JobTrackr AI turns messy confirmations into clean application cards you approve first.', icon: 'sparkles-outline' },
  { image: IMAGES.onboarding2, eyebrow: 'LIVE PIPELINE', title: 'Move every role through a beautiful Kanban workflow.', body: 'Track Applied, Screening, Interview, Offer, and Rejected without spreadsheet chaos.', icon: 'grid-outline' },
  { image: IMAGES.onboarding3, eyebrow: 'CAREER SIGNALS', title: 'See what resumes and stages are working fastest.', body: 'Analytics, reminders, and resume versions help you follow up at the right moment.', icon: 'analytics-outline' },
] as const;

function FloatingWord({ word, index }: { word: string; index: number }) {
  const rise = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    rise.value = withDelay(index * 58, withTiming(1, { duration: 560 }));
    breathe.value = withDelay(index * 90, withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 1800 })), -1, true));
  }, [breathe, index, rise]);

  const style = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [
      { translateY: 18 - rise.value * 18 + (breathe.value - 0.5) * 8 },
      { scale: 0.96 + rise.value * 0.04 },
    ],
  }));

  return <Animated.Text style={[styles.word, style]}>{word}</Animated.Text>;
}

export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const float = useSharedValue(0);
  const entrance = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withSequence(withTiming(1, { duration: 2200 }), withTiming(0, { duration: 2200 })), -1, true);
  }, [float]);

  useEffect(() => {
    entrance.value = 0;
    entrance.value = withDelay(80, withTiming(1, { duration: 650 }));
  }, [index, entrance]);

  const floatingStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -10 + float.value * 20 }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: entrance.value, transform: [{ translateY: 28 - entrance.value * 28 }] }));

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={16}
        testID="onboarding-carousel"
        {...webTest('onboarding-carousel')}
      >
        {slides.map((slide, i) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Image source={{ uri: slide.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <View style={styles.overlay} />
            <Animated.Text style={[styles.floatingLabel, i === index && floatingStyle]}>JOBTRACKR AI</Animated.Text>
            <Animated.Text style={[styles.floatingLabelTwo, i === index && floatingStyle]}>{slide.eyebrow}</Animated.Text>
            <Animated.View style={[styles.orb, i === index && floatingStyle]}>
              <Ionicons name={slide.icon} size={34} color="#FFFFFF" />
            </Animated.View>
            <Animated.View style={[styles.copy, i === index && titleStyle]}>
              <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
              <View style={styles.wordWrap}>{slide.title.split(' ').map((word, wordIndex) => <FloatingWord key={`${word}-${wordIndex}-${i}`} word={word} index={wordIndex} />)}</View>
              <Text style={styles.body}>{slide.body}</Text>
            </Animated.View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>{slides.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}</View>
        <Pressable onPress={onFinish} style={styles.cta} testID="onboarding-next-slide-button" {...webTest('onboarding-next-slide-button')}>
          <Text style={styles.ctaText}>{index === slides.length - 1 ? 'Enter JobTrackr AI' : 'Skip intro'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  slide: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 170 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.46)' },
  floatingLabel: { position: 'absolute', top: 160, left: 24, color: 'rgba(255,255,255,.06)', fontSize: 54, fontWeight: '900', letterSpacing: -2, transform: [{ rotate: '-6deg' }] },
  floatingLabelTwo: { position: 'absolute', top: 292, right: 18, color: 'rgba(245,166,35,.13)', fontSize: 28, fontWeight: '900', letterSpacing: 4, transform: [{ rotate: '7deg' }] },
  orb: { position: 'absolute', top: 96, right: 28, width: 86, height: 86, borderRadius: 30, backgroundColor: 'rgba(0,122,255,.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center', shadowColor: '#007AFF', shadowOpacity: .8, shadowRadius: 28 },
  copy: { gap: 16 },
  eyebrow: { color: '#F5A623', fontSize: 13, fontWeight: '900', letterSpacing: 2.4 },
  wordWrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 1 },
  word: { color: '#FFFFFF', fontSize: 38, lineHeight: 43, fontWeight: '900', letterSpacing: -1.3, textShadowColor: 'rgba(0,122,255,.24)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  body: { color: '#D4D4D8', fontSize: 17, lineHeight: 26, fontWeight: '600' },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 30, gap: 18 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { height: 8, width: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,.22)' },
  dotActive: { width: 34, backgroundColor: '#007AFF' },
  cta: { minHeight: 58, borderRadius: 19, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowColor: '#007AFF', shadowOpacity: .55, shadowRadius: 24, elevation: 8 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});