import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Alert, Dimensions, Platform, BackHandler,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addScan, selectHistory } from '../store/slices/historySlice';
import { useStripePayment } from '../hooks/useStripePayment';
import { identifyCoin, assessPhotoQuality } from '../services/coinIdentification';
import { saveHistory } from '../services/storage';
import LoadingOverlay from '../components/LoadingOverlay';
import ScanLimitModal from '../components/ScanLimitModal';
import UpgradeModal from '../components/UpgradeModal';
import { useScanLimit } from '../hooks/useScanLimit';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { colors, spacing, borderRadius, fonts } from '../theme';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const VIEWFINDER_SIZE = width * 0.72;

export default function CameraScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const dispatch  = useDispatch();
  const history   = useSelector(selectHistory);

  const [flash,        setFlash]        = useState('off');
  const [step,         setStep]         = useState('front');
  const [frontUri,     setFrontUri]     = useState(null);
  const [backUri,      setBackUri]      = useState(null);
  const [previewUri,   setPreviewUri]   = useState(null);
  const [qualityScore, setQualityScore] = useState(null);
  const [isAnalyzing,  setIsAnalyzing]  = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [showLimitModal,   setShowLimitModal]   = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [bannerDismissed,  setBannerDismissed]  = useState(false);

  const cameraRef = useRef(null);

  const {
    scansUsed, scansRemaining, limitReached,
    maxScans, syncScansRemaining, resetLabel, isPremium,
  } = useScanLimit();
  const { startPayment, paymentLoading } = useStripePayment();

  const { trialDaysLeft } = useFeatureAccess('basicIdentify');

  const inCameraMode = step !== 'review' && previewUri === null;
  const isFrontStep  = step === 'front';

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // Prevent Android hardware back button from navigating away mid-analysis.
  useEffect(() => {
    if (!isAnalyzing) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isAnalyzing]);

  function resetAll() {
    setStep('front');
    setFrontUri(null);
    setBackUri(null);
    setPreviewUri(null);
    setQualityScore(null);
    setProgress(0);
  }

  // ── Scan counter colours ─────────────────────────────────────────────────
  function scanCounterColor() {
    if (isPremium)         return colors.success;
    if (limitReached)      return colors.error;
    if (scansRemaining === 1) return colors.warning;
    return colors.success;
  }

  async function takePicture() {
    if (limitReached) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowLimitModal(true);
      return;
    }
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      setPreviewUri(photo.uri);
      const q = await assessPhotoQuality(photo.uri);
      setQualityScore(q);
    } catch {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  }

  async function pickFromGallery() {
    if (limitReached) {
      setShowLimitModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPreviewUri(result.assets[0].uri);
      const q = await assessPhotoQuality(result.assets[0].uri);
      setQualityScore(q);
    }
  }

  function confirmPhoto() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!previewUri) return;
    if (step === 'front') {
      setFrontUri(previewUri);
      setPreviewUri(null);
      setQualityScore(null);
      setStep('back');
    } else {
      setBackUri(previewUri);
      setPreviewUri(null);
      setQualityScore(null);
      setStep('review');
    }
  }

  async function analyzePhotos() {
    if (!frontUri) return;
    // Final guard — re-check limit before consuming the scan
    if (limitReached) {
      setShowLimitModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setProgress(0);
    const interval = setInterval(
      () => setProgress(p => (p >= 88 ? (clearInterval(interval), 88) : p + Math.random() * 12)),
      350,
    );
    try {
      const result = await identifyCoin(frontUri, backUri);
      // Reflect the server's authoritative remaining count (set by the edge
      // function) instead of a blind local increment.
      await syncScansRemaining(result.scansRemaining);
      clearInterval(interval);
      setProgress(100);
      const entry = {
        coin: result.coin,
        confidence: result.confidence,
        frontImageUri: frontUri,
        backImageUri: backUri,
        imageUri: frontUri,
        analysisDetails: result.analysisDetails,
        alternativeMatches: result.alternativeMatches,
      };
      dispatch(addScan(entry));
      await saveHistory(
        [{ id: Date.now().toString(), ...entry, scannedAt: new Date().toISOString() }, ...history].slice(0, 50),
      );
      setTimeout(() => {
        setIsAnalyzing(false);
        navigation.navigate('Results', { result: entry });
        resetAll();
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setIsAnalyzing(false);
      const status = err?.status;
      const msg = err?.message || '';
      if (status === 429 || msg.includes('429') || msg.toLowerCase().includes('scan limit')) {
        setShowLimitModal(true);
      } else {
        // Show the real (server-sanitized) reason instead of always blaming
        // photo quality, so genuine failures are diagnosable.
        Alert.alert('Analysis Failed', msg || 'Could not identify the coin. Please try again.');
      }
    }
  }

  function handleUpgradeFromLimit() {
    setShowLimitModal(false);
    setShowUpgradeModal(true);
  }

  async function handleUpgradeContinue(plan) {
    const success = await startPayment(plan);
    if (success) setShowUpgradeModal(false);
  }

  /* ── Permission screens ─────────────────────────────────────────────── */
  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Checking permissions…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <View style={styles.permIcon}>
          <MaterialCommunityIcons name="camera-off" size={36} color={colors.textMuted} />
        </View>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSub}>Allow camera access to photograph and identify coins</Text>
        <TouchableOpacity onPress={requestPermission} activeOpacity={0.88}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.permBtn}
          >
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── Scan counter badge ─────────────────────────────────────────────── */
  const ScanCounter = () => {
    if (isPremium) {
      return (
        <View style={[styles.scanBadge, { borderColor: 'rgba(74,222,128,0.4)' }]}>
          <MaterialCommunityIcons name="infinity" size={13} color={colors.success} />
          <Text style={[styles.scanBadgeText, { color: colors.success }]}>Unlimited</Text>
        </View>
      );
    }
    const color = scanCounterColor();
    return (
      <View style={[styles.scanBadge, { borderColor: color + '55' }]}>
        <MaterialCommunityIcons name="line-scan" size={13} color={color} />
        <Text style={[styles.scanBadgeText, { color }]}>
          {limitReached ? 'Limit reached' : `${scansRemaining}/${maxScans} scans left`}
        </Text>
        {limitReached && (
          <Text style={[styles.scanBadgeReset, { color }]}>· resets {resetLabel}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <LoadingOverlay visible={isAnalyzing} message="Identifying your coin…" progress={progress} />

      <ScanLimitModal
        visible={showLimitModal}
        resetLabel={resetLabel}
        onUpgrade={handleUpgradeFromLimit}
        onDismiss={() => setShowLimitModal(false)}
      />

      <UpgradeModal
        visible={showUpgradeModal}
        featureName="Unlimited Scans"
        loading={paymentLoading}
        onContinue={handleUpgradeContinue}
        onClose={() => !paymentLoading && setShowUpgradeModal(false)}
      />

      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash}
        active={isFocused && inCameraMode}
      />

      {/* Preview overlay */}
      {previewUri && (
        <View style={StyleSheet.absoluteFill}>
          <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.glassBg} />

          <TouchableOpacity
            style={[styles.topIconBtn, { top: insets.top + 16, left: spacing.edge }]}
            onPress={() => { setPreviewUri(null); setQualityScore(null); }}
          >
            <MaterialCommunityIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {qualityScore?.score != null && (
            <View style={[styles.qualityBadge, {
              backgroundColor: qualityScore.rating === 'excellent'
                ? 'rgba(74,222,128,0.9)'
                : qualityScore.rating === 'good'
                  ? 'rgba(234,179,8,0.9)'
                  : 'rgba(251,146,60,0.9)',
            }]}>
              <Text style={styles.qualityText}>
                {qualityScore.rating.charAt(0).toUpperCase() + qualityScore.rating.slice(1)} · {qualityScore.score}%
              </Text>
            </View>
          )}

          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setPreviewUri(null); setQualityScore(null); }}>
              <MaterialCommunityIcons name="camera-retake" size={18} color={colors.text} />
              <Text style={styles.secondaryBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmPhoto} activeOpacity={0.88} style={{ flex: 1 }}>
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.confirmBtn}
              >
                <MaterialCommunityIcons name="check" size={20} color={colors.onPrimary} />
                <Text style={styles.confirmBtnText}>
                  {isFrontStep ? 'Use Front' : 'Use Back'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Review overlay */}
      {step === 'review' && !previewUri && (
        <View style={[StyleSheet.absoluteFill, styles.reviewBg]}>
          <Image source={{ uri: frontUri }} style={[StyleSheet.absoluteFill, { opacity: 0.18 }]} resizeMode="cover" blurRadius={14} />

          <TouchableOpacity
            style={[styles.topIconBtn, { position: 'absolute', top: insets.top + 16, left: spacing.edge, zIndex: 10 }]}
            onPress={resetAll}
          >
            <MaterialCommunityIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.reviewContent}>
            <Text style={styles.reviewTitle}>Ready to Identify</Text>
            <Text style={styles.reviewSub}>Both sides captured</Text>

            <View style={styles.reviewPhotos}>
              {[{ uri: frontUri, label: 'FRONT' }, { uri: backUri, label: 'BACK' }].map(({ uri, label }) => (
                <View key={label} style={styles.reviewPhotoWrap}>
                  <Image source={{ uri }} style={styles.reviewPhoto} resizeMode="cover" />
                  <View style={styles.reviewLabel}>
                    <MaterialCommunityIcons name="check-circle" size={12} color={colors.success} />
                    <Text style={styles.reviewLabelText}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.reviewActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={resetAll}>
                <MaterialCommunityIcons name="camera-retake" size={18} color={colors.text} />
                <Text style={styles.secondaryBtnText}>Restart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={limitReached ? () => setShowLimitModal(true) : analyzePhotos}
                activeOpacity={0.88}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={limitReached
                    ? ['rgba(100,100,100,0.5)', 'rgba(80,80,80,0.5)']
                    : [colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.confirmBtn}
                >
                  <MaterialCommunityIcons
                    name={limitReached ? 'lock' : 'magnify-scan'}
                    size={20}
                    color={limitReached ? colors.textMuted : colors.onPrimary}
                  />
                  <Text style={[styles.confirmBtnText, limitReached && { color: colors.textMuted }]}>
                    {limitReached ? 'Limit Reached' : 'Identify Coin'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Camera controls */}
      {inCameraMode && (
        <>
          {/* Top bar */}
          <View style={[styles.topBar, { top: insets.top + 12 }]}>
            <View style={styles.topIconBtn} />

            <View style={{ alignItems: 'center', gap: 6 }}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  {isFrontStep ? 'Step 1 of 2 — Front' : 'Step 2 of 2 — Back'}
                </Text>
              </View>
              <ScanCounter />
            </View>

            <TouchableOpacity
              style={[styles.topIconBtn, flash === 'on' && styles.topIconBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFlash(v => v === 'off' ? 'on' : 'off');
              }}
            >
              <MaterialCommunityIcons
                name={flash === 'on' ? 'flash' : 'flash-off'}
                size={22}
                color={flash === 'on' ? colors.primary : '#fff'}
              />
            </TouchableOpacity>
          </View>

          {/* Dark overlay panels */}
          <View style={styles.vfTop} />
          <View style={styles.vfMiddle}>
            <View style={styles.vfSide} />
            <View style={styles.vfBox}>
              <View style={styles.viewfinder}>
                <View style={styles.viewfinderInner} />
              </View>
            </View>
            <View style={styles.vfSide} />
          </View>
          <View style={styles.vfBottom} />

          {/* Hint */}
          <Text style={styles.hint}>
            {limitReached
              ? 'Daily scan limit reached — upgrade for unlimited'
              : isFrontStep
                ? 'Place the FRONT of the coin within the circle'
                : 'Flip the coin — photograph the BACK'}
          </Text>

          {/* Step dots */}
          <View style={styles.stepDots}>
            <View style={[styles.dot, isFrontStep ? styles.dotActive : styles.dotDone]} />
            <View style={styles.dotLine} />
            <View style={[styles.dot, isFrontStep ? styles.dotInactive : styles.dotActive]} />
          </View>

          {/* Front thumbnail during back step */}
          {!isFrontStep && frontUri && (
            <View style={styles.frontThumb}>
              <Image source={{ uri: frontUri }} style={styles.frontThumbImg} />
              <Text style={styles.frontThumbLabel}>FRONT ✓</Text>
            </View>
          )}

          {/* Glass bottom controls */}
          <View style={[styles.glassControls, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity style={styles.sideCtrl} onPress={pickFromGallery}>
              <View style={styles.sideCtrlIcon}>
                <MaterialCommunityIcons name="image-multiple-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.sideCtrlLabel}>Gallery</Text>
            </TouchableOpacity>

            {/* Shutter — visually disabled when limit reached */}
            <TouchableOpacity
              style={[styles.shutter, limitReached && styles.shutterDisabled]}
              onPress={limitReached ? () => setShowLimitModal(true) : takePicture}
            >
              {limitReached ? (
                <View style={styles.shutterLocked}>
                  <MaterialCommunityIcons name="lock" size={24} color={colors.textMuted} />
                </View>
              ) : (
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.shutterInner}
                />
              )}
            </TouchableOpacity>

            <View style={styles.sideCtrl} />
          </View>
        </>
      )}
    </View>
  );
}

const DARK  = 'rgba(10,10,10,0.62)';
const GLASS = 'rgba(13,13,13,0.82)';

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.lg,
  },
  permIcon:    { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  permTitle:   { fontFamily: fonts.serif, fontSize: 22, color: colors.text, textAlign: 'center' },
  permSub:     { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  permText:    { fontFamily: fonts.sans, fontSize: 16, color: colors.textMuted },
  permBtn:     { paddingHorizontal: spacing.xl, paddingVertical: 15, borderRadius: borderRadius.md },
  permBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onPrimary },

  // Top bar
  topBar: {
    position: 'absolute', left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: spacing.edge,
  },
  topIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  topIconBtnActive: { backgroundColor: 'rgba(242,202,80,0.2)', borderWidth: 1, borderColor: colors.primary },
  stepBadge:     { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full },
  stepBadgeText: { fontFamily: fonts.sansMedium, fontSize: 13, color: '#fff' },

  // Scan counter badge
  scanBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  scanBadgeText:  { fontFamily: fonts.sansBold, fontSize: 11 },
  scanBadgeReset: { fontFamily: fonts.sans,     fontSize: 10 },

  // Viewfinder
  vfTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: '18%', backgroundColor: DARK },
  vfBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '27%', backgroundColor: DARK },
  vfMiddle: { position: 'absolute', top: '18%', bottom: '27%', left: 0, right: 0, flexDirection: 'row' },
  vfSide:   { flex: 1, backgroundColor: DARK },
  vfBox:    { width: VIEWFINDER_SIZE, alignItems: 'center', justifyContent: 'center' },
  viewfinder: {
    width: VIEWFINDER_SIZE * 0.88, height: VIEWFINDER_SIZE * 0.88,
    borderRadius: VIEWFINDER_SIZE * 0.44,
    borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  viewfinderInner: {
    width: VIEWFINDER_SIZE * 0.6, height: VIEWFINDER_SIZE * 0.6,
    borderRadius: VIEWFINDER_SIZE * 0.3,
    borderWidth: 1, borderColor: 'rgba(242,202,80,0.3)', borderStyle: 'dashed',
  },

  // Hint & dots
  hint: {
    position: 'absolute', bottom: '29%', alignSelf: 'center',
    fontFamily: fonts.sans, fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center', paddingHorizontal: spacing.xl,
  },
  stepDots:    { position: 'absolute', bottom: '26.5%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  dotActive:   { backgroundColor: colors.primary },
  dotDone:     { backgroundColor: colors.success },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  dotLine:     { width: 28, height: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Front thumbnail
  frontThumb:      { position: 'absolute', top: 108, right: spacing.edge, alignItems: 'center', gap: 4, zIndex: 10 },
  frontThumbImg:   { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: colors.success },
  frontThumbLabel: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.success, letterSpacing: 0.8 },

  // Glass bottom controls
  glassControls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: GLASS,
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  sideCtrl:      { width: 72, alignItems: 'center', gap: 5 },
  sideCtrlIcon:  { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  sideCtrlLabel: { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.65)' },

  shutter: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 3, borderColor: 'rgba(242,202,80,0.5)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterDisabled: { borderColor: 'rgba(255,255,255,0.2)' },
  shutterLocked:   { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  shutterInner:    { width: 60, height: 60, borderRadius: 30 },

  // Preview
  glassBg:        { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, backgroundColor: GLASS },
  qualityBadge:   { position: 'absolute', top: 70, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full },
  qualityText:    { fontFamily: fonts.sansBold, fontSize: 12, color: '#000' },
  previewActions: { position: 'absolute', bottom: 40, left: spacing.edge, right: spacing.edge, flexDirection: 'row', gap: spacing.sm },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderRadius: borderRadius.full,
  },
  secondaryBtnText: { fontFamily: fonts.sansMedium, fontSize: 15, color: '#fff' },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14, borderRadius: borderRadius.full,
  },
  confirmBtnText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onPrimary },

  // Review
  reviewBg:        { backgroundColor: colors.background, justifyContent: 'center' },
  reviewContent:   { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.edge, zIndex: 1 },
  reviewTitle:     { fontFamily: fonts.serif,     fontSize: 24, color: colors.text },
  reviewSub:       { fontFamily: fonts.sans,      fontSize: 14, color: colors.textMuted },
  reviewPhotos:    { flexDirection: 'row', gap: spacing.md, width: '100%' },
  reviewPhotoWrap: { flex: 1, alignItems: 'center', gap: spacing.sm },
  reviewPhoto:     { width: '100%', aspectRatio: 1, borderRadius: borderRadius.xl, borderWidth: 1.5, borderColor: colors.primary },
  reviewLabel:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewLabelText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.success, letterSpacing: 1 },
  reviewActions:   { flexDirection: 'row', gap: spacing.sm, width: '100%' },
});
