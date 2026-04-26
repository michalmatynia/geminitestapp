import React, { useState } from 'react';
import { View } from 'react-native';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { DeferredHomeAccountSignInForm, PrimaryButton, LabeledTextField } from '../homeScreenPrimitives';

interface HomeLearnerCredentialsSignInSectionProps {
  isDeferredReady: boolean;
  onSignIn: (loginName: string, password: string) => Promise<void>;
}

export function HomeLearnerCredentialsSignInSection({
  isDeferredReady,
  onSignIn,
}: HomeLearnerCredentialsSignInSectionProps): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const [hasRequestedOpen, setHasRequestedOpen] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');

  if (!isDeferredReady && !hasRequestedOpen) {
    return (
      <DeferredHomeAccountSignInForm
        onOpen={() => {
          setHasRequestedOpen(true);
        }}
      />
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <LabeledTextField
        autoCapitalize='none'
        hint={copy({
          de: 'Gib den Schüler-Login ein.',
          en: 'Enter the learner login.',
          pl: 'Wpisz login ucznia.',
        })}
        label={copy({
          de: 'Schuler-Login',
          en: 'Learner login',
          pl: 'Login ucznia',
        })}
        onChangeText={setLoginName}
        placeholder={copy({
          de: 'Schuler-Login',
          en: 'Learner login',
          pl: 'Login ucznia',
        })}
        textContentType='username'
        value={loginName}
      />
      <LabeledTextField
        autoCapitalize='none'
        hint={copy({
          de: 'Gib das Schülerpasswort ein.',
          en: 'Enter the learner password.',
          pl: 'Wpisz hasło ucznia.',
        })}
        label={copy({
          de: 'Passwort',
          en: 'Password',
          pl: 'Hasło',
        })}
        onChangeText={setPassword}
        placeholder={copy({
          de: 'Passwort',
          en: 'Password',
          pl: 'Hasło',
        })}
        secureTextEntry
        textContentType='password'
        value={password}
      />
      <PrimaryButton
        label={copy({
          de: 'Anmelden',
          en: 'Sign in',
          pl: 'Zaloguj się',
        })}
        onPress={() => onSignIn(loginName, password)}
      />
    </View>
  );
}
