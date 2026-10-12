import { useState } from 'react'
import SensorExplorer from './SensorExplorer'
import RuleComparison from './RuleComparison'
import ModelComparison from './ModelComparison'
import './App.css'

const groups = [
  {
    id: 'COMP1',
    label: '압축기 관련 신호 1',
    failure: 42,
    normal: 46,
    earlyFailure: 37,
    earlyNormal: 43,
  },
  {
    id: 'COMP2',
    label: '압축기 관련 신호 2',
    failure: 22,
    normal: 17,
    earlyFailure: 17,
    earlyNormal: 13,
  },
  {
    id: 'ECONOMIZER1',
    label: '이코노마이저 관련 신호 1',
    failure: 42,
    normal: 42,
    earlyFailure: 32,
    earlyNormal: 38,
  },
  {
    id: 'ECONOMIZER2',
    label: '이코노마이저 관련 신호 2',
    failure: 19,
    normal: 17,
    earlyFailure: 19,
    earlyNormal: 14,
  },
  {
    id: 'FLUID_PUMP',
    label: '열전달 유체 펌프 관련 신호',
    failure: 37,
    normal: 44,
    earlyFailure: 36,
    earlyNormal: 40,
  },
  {
    id: 'EXTERNAL_LOAD',
    label: '외부 운전 관련 신호',
    failure: 12,
    normal: 12,
    earlyFailure: 7,
    earlyNormal: 9,
  },
]

const steps = [
  '냉동기 개념도',
  '센서 상세',
  '경보 규칙',
  'AI 모델 비교',
]

function App() {
  const [selectedId, setSelectedId] = useState('COMP1')
  const [early, setEarly] = useState(false)
  const [step, setStep] = useState(0)

  function goToStep(nextStep: number) {
    if (nextStep < 0 || nextStep >= steps.length) return

    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selected =
    groups.find((group) => group.id === selectedId) ?? groups[0]

  const failureCount = early ? selected.earlyFailure : selected.failure
  const normalCount = early ? selected.earlyNormal : selected.normal
  const failureRate = (failureCount / 54) * 100
  const normalRate = (normalCount / 54) * 100
  const difference = failureRate - normalRate

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">M</div>

          <div>
            <strong>MainChiller Watch</strong>
            <span>전조 분석 결과 활용 데모</span>
          </div>
        </div>

        <div className="demo-badge">
          집계 데이터 기반 · 실시간 추론 미포함
        </div>
      </header>

      <main>
        <nav className="step-navigation" aria-label="데모 단계">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`step-button ${step === index ? 'active' : ''}`}
              onClick={() => goToStep(index)}
              aria-current={step === index ? 'step' : undefined}
            >
              <span className="step-number">{index + 1}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div hidden={step !== 0}>
          <section className="page-heading">
            <div>
              <p className="eyebrow">01 / EQUIPMENT EXPLORER</p>
              <h1>냉동기에서 분석 결과까지</h1>

              <p className="subtitle">
                분석 그룹을 선택하고 고장 전·정상 구간의 이상 발생을
                비교합니다.
              </p>
            </div>

            <div className="sample-card">
              <span>고장–정상 매칭</span>
              <strong>54쌍</strong>
              <small>15번 그룹 비교 기준</small>
            </div>
          </section>

          <div className="workspace">
            <section className="equipment-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">MAINCHILLER</p>
                  <h2>분석 대상 개념도</h2>
                </div>

                <span className="small-tag">그룹 선택</span>
              </div>

              <div className="machine-stage">
                <div className="machine">
                  <div className="machine-top" />
                  <div className="machine-side" />

                  <div className="machine-front">
                    <div className="machine-nameplate">
                      <span>MAIN CHILLER</span>
                      <span>ANALYSIS MAP</span>
                    </div>

                    <div className="group-grid">
                      {groups
                        .filter((group) => group.id !== 'EXTERNAL_LOAD')
                        .map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            className={`group-button ${
                              selectedId === group.id ? 'selected' : ''
                            } ${
                              group.id === 'FLUID_PUMP' ? 'wide' : ''
                            }`}
                            onClick={() => setSelectedId(group.id)}
                            aria-pressed={selectedId === group.id}
                          >
                            <span className="component-symbol">
                              {group.id.startsWith('COMP')
                                ? '◉'
                                : group.id === 'FLUID_PUMP'
                                  ? '▣'
                                  : '▥'}
                            </span>

                            <strong>{group.id}</strong>
                            <span>{group.label}</span>
                          </button>
                        ))}
                    </div>

                    <div className="vent">
                      {Array.from({ length: 12 }, (_, index) => (
                        <i key={index} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`external-button ${
                  selectedId === 'EXTERNAL_LOAD' ? 'selected' : ''
                }`}
                onClick={() => setSelectedId('EXTERNAL_LOAD')}
                aria-pressed={selectedId === 'EXTERNAL_LOAD'}
              >
                <span>EXTERNAL_LOAD</span>
                <span className="external-label">
                  외부 운전 관련 신호 보기 →
                </span>
              </button>

              <p className="diagram-note">
                데이터 분류를 표현한 개념도입니다. 실제 부품
                배치·배관 연결·냉매 흐름을 나타내지 않습니다.
              </p>
            </section>

            <section className="detail-panel">
              <p className="breadcrumb">
                MainChiller / {selected.id}
              </p>

              <h2>{selected.id}</h2>
              <p className="group-description">{selected.label}</p>

              <div
                className="period-switch"
                aria-label="비교 구간 선택"
              >
                <button
                  type="button"
                  className={!early ? 'active' : ''}
                  onClick={() => setEarly(false)}
                  aria-pressed={!early}
                >
                  전체 관찰 구간
                </button>

                <button
                  type="button"
                  className={early ? 'active' : ''}
                  onClick={() => setEarly(true)}
                  aria-pressed={early}
                >
                  180초 이전
                </button>
              </div>

              <p className="period-description">
                {early
                  ? '고장 최소 180초 전에 확인된 이상 발생률 비교'
                  : '고장 전 10분 관찰 구간의 이상 발생률 비교'}
              </p>

              <div className="metric-grid">
                <div className="metric-card failure">
                  <span>고장창 이상 발생률</span>
                  <strong>{failureRate.toFixed(1)}%</strong>
                  <small>{failureCount} / 54개 고장창</small>
                </div>

                <div className="metric-card normal">
                  <span>정상창 이상 발생률</span>
                  <strong>{normalRate.toFixed(1)}%</strong>
                  <small>{normalCount} / 54개 정상창</small>
                </div>
              </div>

              <div className="comparison-chart">
                <div className="bar-row">
                  <span>고장창</span>

                  <div className="bar-track">
                    <div
                      className="bar-fill failure-fill"
                      style={{ width: `${failureRate}%` }}
                    />
                  </div>

                  <strong>{failureRate.toFixed(1)}%</strong>
                </div>

                <div className="bar-row">
                  <span>정상창</span>

                  <div className="bar-track">
                    <div
                      className="bar-fill normal-fill"
                      style={{ width: `${normalRate}%` }}
                    />
                  </div>

                  <strong>{normalRate.toFixed(1)}%</strong>
                </div>

                <p className="chart-caption">
                  이상 발생률 · 동일 척도 0–100%
                </p>
              </div>

              <div className="difference-row">
                <span>고장창 − 정상창</span>

                <strong>
                  {difference > 0 ? '+' : ''}
                  {difference.toFixed(1)}%p
                </strong>
              </div>

              <div className="interpretation">
                <span>결과 읽기</span>

                <p>
                  {difference > 0
                    ? '이 조건에서는 고장창에서 이상이 더 자주 관찰되었습니다. 이 차이만으로 고장 원인이나 예측 성능을 확정할 수는 없습니다.'
                    : difference < 0
                      ? '이 조건에서는 정상창에서 이상이 더 자주 관찰되었습니다. 단순 이상 여부만으로 고장을 구별하기 어렵습니다.'
                      : '고장창과 정상창의 이상 발생률이 같습니다. 단순 이상 여부만으로 두 구간을 구별하기 어렵습니다.'}
                </p>
              </div>

              <p className="source-note">
                출처: 15_GROUP_COMPARISON.csv · 창 단위 집계
                <br />
                이상 발생률은 부품 고장률이나 고장 확률이 아닙니다.
              </p>

              <button
                type="button"
                className="sensor-drilldown-button"
                onClick={() => goToStep(1)}
              >
                {selected.id} 센서 상세 보기 →
              </button>
            </section>
          </div>
        </div>

        <div hidden={step !== 1}>
          <div className="presentation-context">
            <span>현재 분석 그룹</span>

            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              aria-label="센서 분석 그룹 선택"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.id} · {group.label}
                </option>
              ))}
            </select>
          </div>

          <SensorExplorer key={selectedId} groupId={selectedId} />
        </div>

        <div hidden={step !== 2}>
          <RuleComparison />
        </div>

        <div hidden={step !== 3}>
          <ModelComparison />
        </div>

        <div className="presentation-controls">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => goToStep(step - 1)}
          >
            ← 이전 단계
          </button>

          <span>
            {step + 1} / {steps.length} · {steps[step]}
          </span>

          <button
            type="button"
            disabled={step === steps.length - 1}
            onClick={() => goToStep(step + 1)}
          >
            다음 단계 →
          </button>
        </div>

        <footer className="page-footer">
          <span>집계 결과 기반 · 실시간 추론 미포함</span>
          <span>개념도 → 센서 → 규칙 → 모델 비교</span>
        </footer>
      </main>
    </div>
  )
}

export default App