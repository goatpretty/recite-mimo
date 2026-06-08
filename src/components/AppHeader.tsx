interface AppHeaderProps {
  onOpenSettings: () => void
}

export const AppHeader = ({ onOpenSettings }: AppHeaderProps) => (
  <header className="app-header">
    <div>
      <h1>MiMo 背书训练</h1>
      <p>临时会话式背书训练器</p>
    </div>
    <button type="button" className="settings-button" onClick={onOpenSettings}>
      ⚙ 设置
    </button>
  </header>
)
