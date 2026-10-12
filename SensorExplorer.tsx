import { useEffect, useState } from 'react'

type SensorRow = {
  group: string
  sensor: string
  matched_pairs: number
  failure_events: number
  normal_events: number
  failure_early180_events: number
  normal_early180_events: number
}

type Props = {
  groupId: string
}

function parseSensors(text: string): SensorRow[] {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const headers = lines[0].split(',').map((value) => value.trim())

  const required = [
    'group',
    'sensor',
    'matched_pairs',
    'failure_events',
    'normal_events',
    'failure_early180_events',
    'normal_early180_events',
  ]

  if (!required.every((name) => headers.includes(name))) {
    throw new Error('CSV 열 이름을 확인해주세요. 원본 센서 비교 파일이 필요합니다.')
  }

  // 현재 원본 CSV는 필드 내부에 쉼표가 없는 형식입니다.
  return lines.slice(1).filter((line) => line.trim()).map((line) => {
    const values = line.split(',')
    const get = (name: string) => values[headers.indexOf(name)]?.trim()

    const number = (name: string) => {
      const value = get(name)
      if (!value || !Number.isFinite(Number(value))) {
        throw new Error(`CSV 숫자 값을 확인해주세요: ${name}`)
      }
      return Number(value)
    }

    const row = {
      group: get('group') ?? '',
      sensor: get('sensor') ?? '',
      matched_pairs: number('matched_pairs'),
      failure_events: number('failure_events'),
      normal_events: number('normal_events'),
      failure_early180_events: number('failure_early180_events'),
      normal_early180_events: number('normal_early180_events'),
    }

    if (!row.group || !row.sensor || row.matched_pairs <= 0) {
      throw new Error('CSV에 유효하지 않은 센서 행이 있습니다.')
    }

    return row
  })
}

function SensorExplorer({ groupId }: Props) {
  const [rows, setRows] = useState<SensorRow[]>([])
  const [selectedName, setSelectedName] = useState('')
  const [early, setEarly] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/15_SENSOR_COMPARISON.csv`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`CSV를 불러오지 못했습니다. HTTP ${response.status}`)
        }

        const data = parseSensors(await response.text())
        setRows(data)
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

  const sensors = rows.filter((row) => row.group === groupId)
  const selected =
    sensors.find((row) => row.sensor === selectedName) ?? sensors[0]

  if (loading) {
    return <section className="sensor-section">센서 CSV를 읽는 중입니다…</section>
  }

  if (error) {
    return (
      <section className="sensor-section">
        <h2>센서 파일 확인 필요</h2>
        <p>{error}</p>
        <p className="source-note">
          public/data/15_SENSOR_COMPARISON.csv 파일 위치를 확인해주세요.
        </p>
      </section>
    )
  }

  if (!selected) {
    return (
      <section className="sensor-section">
        <h2>{groupId} 센서 상세</h2>
        <p>이 그룹에 해당하는 센서 데이터가 없습니다.</p>
      </section>
    )
  }

  const failureCount = early
    ? selected.failure_early180_events
    : selected.failure_events
  const normalCount = early
    ? selected.normal_early180_events
    : selected.normal_events
  const total = selected.matched_pairs
  const failureRate = (failureCount / total) * 100
  const normalRate = (normalCount / total) * 100
  const difference = failureRate - normalRate

  return (
    <section className="sensor-section" id="sensor-detail">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">02 / SENSOR EXPLORER</p>
          <h2>그룹에서 센서로</h2>
        </div>
        <span className="small-tag">CSV 연결 완료</span>
      </div>

      <p className="breadcrumb sensor-breadcrumb">
        MainChiller / {groupId} / {selected.sensor.replace('MainChiller_', '')}
      </p>

      <div className="sensor-layout">
        <aside className="sensor-list">
          <p className="sensor-list-title">
            {groupId} · 센서 {sensors.length}개
          </p>

          {sensors.map((sensor) => (
            <button
              key={sensor.sensor}
              type="button"
              className={`sensor-item ${
                selected.sensor === sensor.sensor ? 'active' : ''
              }`}
              aria-pressed={selected.sensor === sensor.sensor}
              onClick={() => setSelectedName(sensor.sensor)}
            >
              {sensor.sensor.replace('MainChiller_', '')}
              <span>→</span>
            </button>
          ))}
        </aside>

        <div className="sensor-result">
          <h3>{selected.sensor.replace('MainChiller_', '')}</h3>
          <p className="sensor-id">{selected.sensor}</p>

          <div className="period-switch">
            <button
              type="button"
              className={!early ? 'active' : ''}
              aria-pressed={!early}
              onClick={() => setEarly(false)}
            >
              전체 관찰 구간
            </button>
            <button
              type="button"
              className={early ? 'active' : ''}
              aria-pressed={early}
              onClick={() => setEarly(true)}
            >
              180초 이전
            </button>
          </div>

          <p className="period-description">
            {early
              ? '고장 최소 180초 전에 확인된 센서 이상 비교'
              : '고장 전 10분 관찰 구간의 센서 이상 비교'}
          </p>

          <div className="metric-grid">
            <div className="metric-card failure">
              <span>고장창 이상 발생률</span>
              <strong>{failureRate.toFixed(1)}%</strong>
              <small>{failureCount} / {total}개 고장창</small>
            </div>
            <div className="metric-card normal">
              <span>정상창 이상 발생률</span>
              <strong>{normalRate.toFixed(1)}%</strong>
              <small>{normalCount} / {total}개 정상창</small>
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
          </div>

          <div className="difference-row">
            <span>고장창 − 정상창</span>
            <strong>
              {difference > 0 ? '+' : ''}
              {difference.toFixed(1)}%p
            </strong>
          </div>

          <div className="interpretation">
            <span>센서 결과 읽기</span>
            <p>
              전체 구간에서 나타나는 고장·정상 차이가 180초 이전에도
              유지되는지 비교하세요. 발생률 차이만으로 고장 원인이나
              현장 조기경보 성능을 확정할 수는 없습니다.
            </p>
          </div>

          <p className="source-note">
            출처: 15_SENSOR_COMPARISON.csv · 매칭 {total}쌍
            <br />
            표시값은 집계된 이상 발생률이며 실시간 센서값이 아닙니다.
          </p>
        </div>
      </div>
    </section>
  )
}

export default SensorExplorer