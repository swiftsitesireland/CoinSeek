import { useAuth } from '../auth/AuthContext';
import { useSubscription } from './useSubscription';

// Feature registry — `free: false` = premium-only
const FEATURE_CONFIG = {
  marketValue:   { free: false, label: 'Market Value'            },
  aiAnalysis:    { free: false, label: 'AI Analysis'             },
  gradeReport:   { free: false, label: 'Professional Grading'    },
  rarityAssess:  { free: false, label: 'Rarity Assessment'       },
  advancedStats: { free: false, label: 'Advanced Statistics'     },
  valueTrends:   { free: false, label: 'Collection Value Trends' },
  gradeDistrib:  { free: false, label: 'Grade Distribution'      },
  // Free-tier features:
  basicIdentify: { free: true,  label: 'Basic Identification'    },
  addCollection: { free: true,  label: 'Add to Collection'       },
  basicList:     { free: true,  label: 'Collection List'         },
  // Not yet implemented — registered when UI is built:
  // errorDetection:  { free: false, label: 'Error & Misprint Detection' },
  // advancedFilters: { free: false, label: 'Advanced Filters'        },
};

const TRIAL_DAYS = 7;

export function useFeatureAccess(featureName) {
  const { user } = useAuth();
  // Read from live subscription — not Redux — so revoked subscriptions
  // take effect immediately without requiring an app restart.
  const { isPremium } = useSubscription();

  const feature      = FEATURE_CONFIG[featureName] ?? { free: true, label: featureName };
  const isPremiumOnly = !feature.free;

  // Trial days remaining — anchored to account creation date, not local storage
  let trialDaysLeft = 0;
  const trialAnchor = user?.created_at ?? null;
  if (trialAnchor) {
    const daysSince = Math.floor((Date.now() - new Date(trialAnchor)) / 86_400_000);
    trialDaysLeft   = Math.max(0, TRIAL_DAYS - daysSince);
  }

  const currentTier =
    isPremium           ? 'premium'    :
    trialDaysLeft > 0   ? 'free_trial' : 'expired';

  const isAvailable = isPremium || trialDaysLeft > 0 || !isPremiumOnly;
  const isExpired   = currentTier === 'expired';

  return {
    isAvailable,
    isPremiumOnly,
    currentTier,
    isPremium,
    trialDaysLeft,
    isExpired,
    featureLabel: feature.label,
  };
}
