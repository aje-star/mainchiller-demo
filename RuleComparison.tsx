import { useEffect, useState } from 'react'

type RuleRow = {
  rule: string
  failure_windows: number
  normal_windows: number
  failure_early180_detected: number
  normal_early180_detected: number
  failure_median_confirmed_lead_sec: number | null
}

const ruleLabels: Record<string, string> = {
  ANY_GROUP: '어느 그룹이든 이상',
  ANY_KEY_GROUP: '주요 그룹 중 하나 이상',
  COMP1_GROUP: 'COMP1 그룹 이상',
  ECONOMIZER1_GROUP: 'ECONOMIZER1 그룹 이상',
  FLUID_PUMP_GROUP: 'FLUID_PUMP 그룹 이상',
  COMP1_AND_ECON1: 'COMP1 · ECONOMIZER1 모두',
  ALL_THREE_GROUPS: '세 그룹 모두 이상',
  ORDERED_TRIPLET_COMPLETE: '3단계 순서 완료',
  EXPANSION1_SENSOR: '팽창밸브 1 센서 이상',
  ECON1_TEMP_SENSOR: 'ECONOMIZER1 온도 센서 이상',
}

function parseRules(text: string): RuleRow[] {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const headers = lines[0].split(',').map((value) => value.trim())

  const required = [
    'rule',
    'failure_windows',
    'normal_windows',
    'failure_early180_detected',
    'normal_early180_detected',
    'failure_median_confirmed_lead_sec',
  ]

  if (!required.every((name) => headers.includes(name))) {
    throw new Error('원본 16_RULE_COMPARISON.csv의 열 이름을 확인해주세요.')
  }

  return lines.slice(1).filter((line) => line.trim()).map((line) => {
    const values = line.split(',')
    const get = (name: string) => values[headers.indexOf(name)]?.trim()

    const number = (name: string) => {
      const value = get(name)
      if (!value || !Number.isFinite(Number(value))) {
        throw new Error(`CSV 숫자 값 확인 필요: ${name}`)
      }
      return Number(value)
    }

    const lead = get('failure_median_confirmed_lead_sec')
    const row = {
      rule: get('rule') ?? '',
      failure_windows: number('failure_windows'),
      normal_windows: number('normal_windows'),
      failure_early180_detected: number('failure_early180_detected'),
      normal_early180_detected: number('normal_early180_detected'),
      failure_median_confirmed_lead_sec: lead ? Number(lead) : null,
    }

    if (!row.rule || row.failure_windows <= 0 || row.normal_windows <= 0) {
      throw new Error('규칙 CSV에 유효하지 않은 행이 있습니다.')
    }

    return row
  })
}

function WindowGrid({
  total,
  detected,
  kind,
}: {
  total: number
  detected: number
  kind: 'failure' | 'normal'
}) {
  return (
    <div className="window-grid" aria-label={`${total}개 중 ${detected}개 경보`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`window-cell ${
            index < detected ? `detected-${kind}` : ''
          }`}
        />
      ))}
    </div>
  )
}

function RuleComparison() {
  const [rows, setRows] = useState<RuleRow[]>([])
  const [selectedId, setSelectedId] = useState('ANY_GROUP')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/16_RULE_COMPARISON.csv`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`규칙 CSV를 읽지 못했습니다. HTTP ${response.status}`)
        }

        setRows(parseRules(await response.text()))
      } catch (cause) {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : '파일 읽기 오류')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  if (loading) {
    return <section className="rule-section">규칙 CSV를 읽는 중입니다…</section>
  }

  if (error) {
    return (
      <section className="rule-section">
        <h2>규칙 파일 확인 필요</h2>
        <p>{error}</p>
        <p className="source-note">
          public/data/16_RULE_COMPARISON.csv 위치를 확인해주세요.
        </p>
      </section>
    )
  }

  const selected = rows.find((row) => row.rule === selectedId) ?? rows[0]
  if (!selected) return null

  const failureRate =
    (selected.failure_early180_detected / selected.failure_windows) * 100
  const normalRate =
    (selected.normal_early180_detected / selected.normal_windows) * 100

  return (
    <section className="rule-section" id="rule-comparison">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">03 / ALERT RULE COMPARISON</p>
          <h2>이상을 어떤 조건에서 경보할까?</h2>
        </div>
        <span className="small-tag">180초 이전 · 탐색적 규칙</span>
      </div>

      <p className="subtitle">
        기존 규칙을 선택해 고장창 경보와 정상창 경보를 함께 비교합니다.
      </p>

      <div className="rule-shortcuts">
        <button
          type="button"
          className={selected.rule === 'ANY_GROUP' ? 'active' : ''}
          onClick={() => setSelectedId('ANY_GROUP')}
        >
          ① 어느 그룹이든 이상
        </button>
        <button
          type="button"
          className={
            selected.rule === 'ORDERED_TRIPLET_COMPLETE' ? 'active' : ''
          }
          onClick={() => setSelectedId('ORDERED_TRIPLET_COMPLETE')}
        >
          ② 3단계 순서 완료
        </button>
      </div>

      <label className="rule-selector">
        전체 규칙 선택
        <select
          value={selected.rule}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {rows.map((row) => (
            <option key={row.rule} value={row.rule}>
              {ruleLabels[row.rule] ?? row.rule}
            </option>
          ))}
        </select>
      </label>

      <p className="source-note">규칙 식별자: {selected.rule}</p>

      {selected.rule === 'ORDERED_TRIPLET_COMPLETE' && (
        <div className="pattern-banner">
          <span>COMP1 → ECONOMIZER1 → FLUID_PUMP</span>
          <small>이상 확인 순서 · 물리적 연결이나 원인 전파가 아님</small>
        </div>
      )}

      <div className="rule-results">
        <div className="rule-result-card">
          <p className="result-category">고장창 · 180초 이전 경보</p>
          <strong className="failure-number">{failureRate.toFixed(1)}%</strong>
          <p className="result-count">
            {selected.failure_early180_detected} / {selected.failure_windows}개
          </p>

          <WindowGrid
            total={selected.failure_windows}
            detected={selected.failure_early180_detected}
            kind="failure"
          />

          <div className="result-summary">
            <span>경보: {selected.failure_early180_detected}개</span>
            <span>
              미경보: {
                selected.failure_windows - selected.failure_early180_detected
              }개
            </span>
          </div>
        </div>

        <div className="rule-result-card">
          <p className="result-category">정상창 · 대응 구간 경보</p>
          <strong className="normal-number">{normalRate.toFixed(1)}%</strong>
          <p className="result-count">
            {selected.normal_early180_detected} / {selected.normal_windows}개
          </p>

          <WindowGrid
            total={selected.normal_windows}
            detected={selected.normal_early180_detected}
            kind="normal"
          />

          <div className="result-summary">
            <span>경보: {selected.normal_early180_detected}개</span>
            <span>
              미경보: {
                selected.normal_windows - selected.normal_early180_detected
              }개
            </span>
          </div>
        </div>
      </div>

      <p className="grid-disclaimer">
        각 칸은 집계 건수를 표현합니다. 특정 사건의 식별자·발생 순서가 아닙니다.
      </p>

      <div className="interpretation">
        <span>규칙 결과 읽기</span>
        <p>
          {selected.rule === 'ANY_GROUP'
            ? '고장창 대부분에서 경보하지만 정상창 대부분에서도 경보합니다. 이상을 많이 잡는 것만으로 유용한 고장 경보가 되지는 않습니다.'
            : selected.rule === 'ORDERED_TRIPLET_COMPLETE'
              ? '단순 그룹 이상 규칙보다 정상창 경보가 적지만 고장창 경보도 줄어듭니다. 정상 경보 감소와 놓치는 사건을 함께 판단해야 합니다.'
              : '고장창 경보율과 정상창 경보율을 함께 확인하세요. 이 결과는 기존 데이터에서 비교한 탐색적 규칙의 집계 결과입니다.'}
        </p>
      </div>

      <p className="source-note">
        출처: 16_RULE_COMPARISON.csv
        <br />
        정상창 경보율은 실제 운영시간당 오경보 횟수가 아닙니다.
        새로운 조건의 성능을 계산하거나 최적 규칙을 확정하는 화면이 아닙니다.
      </p>
    </section>
  )
}

export default RuleComparison