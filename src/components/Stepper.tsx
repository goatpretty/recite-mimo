export interface StepperStep {
  title: string
  completed: boolean
  disabled: boolean
}

interface StepperProps {
  steps: StepperStep[]
  currentStep: number
  onStepSelect: (stepIndex: number) => void
}

export const Stepper = ({ steps, currentStep, onStepSelect }: StepperProps) => (
  <nav className="stepper" aria-label="背书训练步骤">
    {steps.map((step, index) => (
      <button
        type="button"
        key={step.title}
        className={[
          'stepper__item',
          index === currentStep ? 'stepper__item--active' : '',
          step.completed ? 'stepper__item--done' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={step.disabled}
        onClick={() => onStepSelect(index)}
      >
        <span>{step.completed ? '✓' : index + 1}</span>
        <strong>{step.title}</strong>
      </button>
    ))}
  </nav>
)
