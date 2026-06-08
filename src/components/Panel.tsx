import type { PropsWithChildren, ReactNode } from 'react'

interface PanelProps extends PropsWithChildren {
  title: string
  eyebrow?: string
  action?: ReactNode
}

export const Panel = ({ title, eyebrow, action, children }: PanelProps) => (
  <section className="panel">
    <div className="panel__header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action ? <div className="panel__action">{action}</div> : null}
    </div>
    {children}
  </section>
)
