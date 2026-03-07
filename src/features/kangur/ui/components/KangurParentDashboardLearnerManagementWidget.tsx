'use client';

import {
  KangurButton,
  KangurOptionCardButton,
  KangurPanel,
  KangurSelectField,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { cn } from '@/shared/utils';

export function KangurParentDashboardLearnerManagementWidget(): React.JSX.Element | null {
  const {
    activeLearner,
    canAccessDashboard,
    createForm,
    editForm,
    feedback,
    handleCreateLearner,
    handleSaveLearner,
    isSubmitting,
    learners,
    selectLearner,
    updateCreateField,
    updateEditField,
  } = useKangurParentDashboardRuntime();

  if (!canAccessDashboard) {
    return null;
  }

  return (
    <div className='flex flex-col gap-6'>
      <KangurPanel className='flex flex-col gap-4' padding='lg' variant='soft'>
        <div className='flex flex-col gap-1'>
          <div className='text-sm font-bold uppercase tracking-wide text-gray-500'>
            Profile uczniow
          </div>
          <div className='text-sm text-gray-500'>
            Rodzic loguje sie emailem, a uczniowie dostaja osobne nazwy logowania i hasla.
          </div>
        </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          {learners.map((learner) => {
            const isActiveLearner = learner.id === activeLearner?.id;
            const initial = learner.displayName.trim().charAt(0).toUpperCase() || '?';
            return (
              <KangurOptionCardButton
                accent='indigo'
                aria-pressed={isActiveLearner}
                className='flex items-start gap-4 rounded-[30px] px-5 py-4 text-left'
                data-doc-id='parent_learner_profile_card'
                data-testid={`parent-dashboard-learner-card-${learner.id}`}
                emphasis={isActiveLearner ? 'accent' : 'neutral'}
                key={learner.id}
                onClick={() => void selectLearner(learner.id)}
                type='button'
              >
                <span
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold shadow-sm',
                    isActiveLearner
                      ? KANGUR_ACCENT_STYLES.indigo.icon
                      : KANGUR_ACCENT_STYLES.slate.icon
                  )}
                >
                  {initial}
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='font-bold text-slate-800'>{learner.displayName}</div>
                      <div className='text-xs text-slate-500'>Login: {learner.loginName}</div>
                    </div>
                    <KangurStatusChip
                      accent={learner.status === 'active' ? 'emerald' : 'slate'}
                      className='uppercase tracking-wide'
                      size='sm'
                    >
                      {learner.status === 'active' ? 'Aktywny' : 'Wylaczony'}
                    </KangurStatusChip>
                  </div>
                  <div
                    className={cn(
                      'mt-2 text-xs font-semibold',
                      isActiveLearner ? 'text-indigo-600' : 'text-slate-500'
                    )}
                  >
                    {isActiveLearner
                      ? 'Aktualnie wybrany profil'
                      : 'Kliknij, aby przelaczyc profil'}
                  </div>
                </div>
              </KangurOptionCardButton>
            );
          })}
        </div>

        <div className='grid gap-3 md:grid-cols-3'>
          <KangurTextField
            accent='indigo'
            value={createForm.displayName}
            onChange={(event) => updateCreateField('displayName', event.target.value)}
            placeholder='Imie ucznia'
          />
          <KangurTextField
            accent='indigo'
            value={createForm.loginName}
            onChange={(event) => updateCreateField('loginName', event.target.value)}
            placeholder='Login ucznia'
          />
          <KangurTextField
            accent='indigo'
            type='password'
            value={createForm.password}
            onChange={(event) => updateCreateField('password', event.target.value)}
            placeholder='Haslo ucznia'
          />
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          <KangurButton
            disabled={isSubmitting}
            onClick={() => void handleCreateLearner()}
            size='md'
            variant='primary'
            data-doc-id='parent_create_learner'
          >
            Dodaj ucznia
          </KangurButton>
          {feedback ? <div className='text-sm text-slate-500'>{feedback}</div> : null}
        </div>
      </KangurPanel>

      {activeLearner ? (
        <KangurPanel className='flex flex-col gap-4' padding='lg' variant='soft'>
          <div className='text-sm font-bold uppercase tracking-wide text-gray-500'>
            Ustawienia wybranego ucznia
          </div>
          <div className='grid gap-3 md:grid-cols-2'>
            <KangurTextField
              accent='indigo'
              value={editForm.displayName}
              onChange={(event) => updateEditField('displayName', event.target.value)}
              placeholder='Imie ucznia'
            />
            <KangurTextField
              accent='indigo'
              value={editForm.loginName}
              onChange={(event) => updateEditField('loginName', event.target.value)}
              placeholder='Login ucznia'
            />
            <KangurTextField
              accent='indigo'
              type='password'
              value={editForm.password}
              onChange={(event) => updateEditField('password', event.target.value)}
              placeholder='Nowe haslo (opcjonalnie)'
            />
            <KangurSelectField
              accent='indigo'
              value={editForm.status}
              onChange={(event) =>
                updateEditField(
                  'status',
                  event.target.value === 'disabled' ? 'disabled' : 'active'
                )
              }
            >
              <option value='active'>Aktywny</option>
              <option value='disabled'>Wylaczony</option>
            </KangurSelectField>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <KangurButton
              disabled={isSubmitting}
              onClick={() => void handleSaveLearner()}
              size='md'
              variant='secondary'
              data-doc-id='parent_save_learner'
            >
              Zapisz ucznia
            </KangurButton>
            <div className='text-xs text-slate-500'>
              Login i haslo naleza do ucznia, ale konto pozostaje wlasnoscia rodzica.
            </div>
          </div>
        </KangurPanel>
      ) : null}
    </div>
  );
}
