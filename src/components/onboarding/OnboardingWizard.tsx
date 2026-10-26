import React, { useState } from 'react';
import { ProductTier } from '../../../shared/constants/tiers';
import { OnboardingStepName } from '../../../shared/types/business';
import { OnboardingDraftData } from '../../../shared/types/onboarding';
import { onboardingService, LaunchOfferResponse } from '../../services/onboardingService';
import { OnboardingProgress } from './OnboardingProgress';
import { ProfileStep } from './ProfileStep';
import { LogoStep } from './LogoStep';
import { ConfigurationStep } from './ConfigurationStep';
import { SecurityStep } from './SecurityStep';
import { ConfirmationStep } from './ConfirmationStep';

interface OnboardingWizardProps {
  sessionToken: string;
  tier: ProductTier;
  initialStep: OnboardingStepName;
  initialDraftData: OnboardingDraftData;
  onCompleted: (launchData: LaunchOfferResponse) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  sessionToken,
  tier,
  initialStep,
  initialDraftData,
  onCompleted,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStepName>(
    initialStep === 'completed' ? 'confirmation' : initialStep
  );
  const [draftData, setDraftData] = useState<OnboardingDraftData>(initialDraftData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStepSave = async (data: Partial<OnboardingDraftData>, nextStep?: OnboardingStepName) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await onboardingService.updateStep(sessionToken, currentStep, data, nextStep);
      setDraftData(res.draftData);
      if (nextStep) {
        setCurrentStep(nextStep);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save progress. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const launchResult = await onboardingService.launchOffer(sessionToken);
      onCompleted(launchResult);
    } catch (err: any) {
      setError(err.message || 'Failed to launch offer. Please check configuration.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-md rounded-3xl border border-[#e2e7e6] shadow-xl p-4 sm:p-10 pb-36 sm:pb-10 relative overflow-x-hidden">
      <OnboardingProgress currentStep={currentStep} />

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold text-left">
          {error}
        </div>
      )}

      {currentStep === 'profile' && (
        <ProfileStep
          initialData={draftData}
          onNext={data => handleStepSave(data, 'logo')}
          isLoading={isLoading}
        />
      )}

      {currentStep === 'logo' && (
        <LogoStep
          initialData={draftData}
          onNext={data => handleStepSave(data, 'configuration')}
          onBack={() => setCurrentStep('profile')}
          isLoading={isLoading}
        />
      )}

      {currentStep === 'configuration' && (
        <ConfigurationStep
          tier={tier}
          initialData={draftData}
          onNext={data => handleStepSave(data, 'security')}
          onBack={() => setCurrentStep('logo')}
          isLoading={isLoading}
        />
      )}

      {currentStep === 'security' && (
        <SecurityStep
          initialData={draftData}
          onNext={data => handleStepSave(data, 'confirmation')}
          onBack={() => setCurrentStep('configuration')}
          isLoading={isLoading}
        />
      )}

      {currentStep === 'confirmation' && (
        <ConfirmationStep
          tier={tier}
          draftData={draftData}
          onLaunch={handleLaunch}
          onBack={() => setCurrentStep('security')}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
