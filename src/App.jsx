import { useEffect, useReducer } from 'react'
import { playClick, unlockAudio } from './audio.js'
import {
  Archive,
  Assembly,
  Hangar,
  Launch,
  Menu,
  MissionSelect,
  Report,
  Settings,
  Voyage,
} from './screens.jsx'
import { boot, loadSave, reducer, writeSave } from './store.js'

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, () => boot(loadSave()))

  useEffect(() => {
    writeSave(state)
  }, [state])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const go = (type, extra = {}) => {
    if (type !== 'CHOOSE' && type !== 'ENTER_FLIGHT') playClick(state.settings.sound)
    dispatch({ type, ...extra })
  }

  if (state.screen === 'menu') {
    return (
      <Menu
        active={state.active}
        onNew={() => go('NEW')}
        onContinue={() => go('CONTINUE')}
        onHangar={() => go('OPEN_HANGAR')}
        onArchive={() => go('OPEN_ARCHIVE')}
        onSettings={() => go('OPEN_SETTINGS')}
      />
    )
  }

  if (state.screen === 'mission') {
    return (
      <MissionSelect
        missionId={state.missionId}
        onSelect={(id) => go('SELECT_MISSION', { id })}
        onHangar={() => go('TO_HANGAR')}
        onMenu={() => go('MENU')}
      />
    )
  }

  if (state.screen === 'assembly') {
    return (
      <Assembly
        missionId={state.missionId}
        parts={state.parts}
        confirm={state.confirm}
        onToggle={(id) => go('TOGGLE_PART', { id })}
        onBack={() => go('BACK_MISSIONS')}
        onAsk={() => go('ASK_LAUNCH')}
        onCancel={() => go('CANCEL_LAUNCH')}
        onLaunch={() => go('LAUNCH')}
      />
    )
  }

  if (state.screen === 'launch') {
    return (
      <Launch
        missionId={state.missionId}
        parts={state.parts}
        sound={state.settings.sound}
        onDone={() => dispatch({ type: 'ENTER_FLIGHT' })}
        onAbort={() => go('RETRY')}
      />
    )
  }

  if (state.screen === 'voyage' && state.run) {
    return (
      <Voyage
        missionId={state.missionId}
        run={state.run}
        pause={state.pause}
        sound={state.settings.sound}
        onChoose={(id) => dispatch({ type: 'CHOOSE', id })}
        onPause={() => go('PAUSE')}
        onResume={() => go('RESUME')}
        onMenu={() => go('SAVE_MENU')}
        onAbort={() => go('ABORT')}
        onReport={() => dispatch({ type: 'OPEN_REPORT' })}
      />
    )
  }

  if (state.screen === 'report') {
    return (
      <Report
        report={state.report}
        fromArchive={state.fromArchive}
        onRetry={() => go('RETRY')}
        onOther={() => go('OTHER_MISSION')}
        onMenu={() => go('MENU')}
        onArchive={() => go('OPEN_ARCHIVE')}
      />
    )
  }

  if (state.screen === 'hangar') {
    return <Hangar hangar={state.hangar} onLoad={(id) => go('LOAD_SHIP', { id })} onMenu={() => go('MENU')} />
  }

  if (state.screen === 'archive') {
    return <Archive archive={state.archive} onOpen={(record) => go('OPEN_RECORD', { record })} onMenu={() => go('MENU')} />
  }

  return (
    <Settings
      sound={state.settings.sound}
      onToggle={() => go('TOGGLE_SOUND')}
      onReset={() => go('RESET_DATA')}
      onMenu={() => go('MENU')}
    />
  )
}
