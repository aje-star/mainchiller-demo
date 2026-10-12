import { useEffect, useState } from 'react'

type ModelRow = {
  model: string
  devPairs: number
  testPairs: number
  positiveRate: number
  cvPrauc: number
  testPrauc: number
  threshold: number
  detectionRate: number
  normalAlertRate: number
}

const labels: Record<string, string> = {
  SENSOR_ONLY: '센서 모델',
  PATTERN_ONLY: '패턴 모델',
  FUSION: '결합 모델',
}

const descriptions: Record<string, string> = {
  SENSOR_ONLY: '센서 정보 기반',
  PATTERN_ONLY: '시간 패턴 정보 기반',
  FUSION: '센서와 패턴 결합',
}

function parseModels(text: string): ModelRow[] {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const headers = lines[0].split(',').map((value) => value.trim())

  const required = [
    'model',
    'dev_pairs',
    'test_pairs',
    'test_positive_rate',
    'cv_pr_auc',
    'test_pr_auc',
    'validation_chosen_threshold',
    'test_detection_within180_rate',
    'test_normal_window_any_alert_rate',
  ]

  if (!required.every((name) => headers.includes(name))) {
    throw new Error('원본 21_MODEL_COMPARISON.csv의 열 이름을 확인해주세요.')
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

    const row = {
      model: get('model') ?? '',
      devPairs: number('dev_pairs'),
      testPairs: number('test_pairs'),
      positiveRate: number('test_positive_rate'),
      cvPrauc: number('cv_pr_auc'),
      testPrauc: number('test_pr_auc'),
      threshold: number('validation_chosen_threshold'),
      detectionRate: number('test_detection_within180_rate'),
      normalAlertRate: number('test_normal_window_any_alert_rate'),
    }

    if (!row.model || row.testPairs <= 0) {
      throw new Error('모델 CSV에 유효하지 않은 행이 있습니다.')
    }

    return row
  })
}

function ModelComparison() {
  const [rows, setRows] = useState<ModelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/21_MODEL_COMPARISON.csv`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`모델 CSV를 읽지 못했습니다. HTTP ${response.status}`)
        }

        setRows(parseModels(await response.text()))
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
    return <section className="model-section">모델 CSV를 읽는 중입니다…</section>
  }

  if (error) {
    return (
      <section className="model-section">
        <h2>모델 파일 확인 필요</h2>
        <p>{error}</p>
        <p className="source-note">
          public/data/21_MODEL_COMPARISON.csv 위치를 확인해주세요.
        </p>
      </section>
    )
  }

  if (rows.length === 0) return null

  return (
    <section className="model-section" id="model-comparison">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">04 / MODEL COMPARISON</p>
          <h2>모델 점수와 경보 성능은 같을까?</h2>
        </div>
        <span className="small-tag">21번 분석 · 선택 임계값 기준</span>
      </div>

      <p className="subtitle">
        PR-AUC, 고장 사건 탐지, 정상창 경보를 함께 확인합니다.
      </p>

      <div className="model-cards">
        {rows.map((row) => {
          const detected = Math.round(row.detectionRate * row.testPairs)

          return (
            <article className="model-card" key={row.model}>
              <p className="eyebrow">{row.model}</p>
              <h3>{labels[row.model] ?? row.model}</h3>
              <p className="model-description">
                {descriptions[row.model] ?? '모델 결과'}
              </p>

              <div className="prauc-metric">
                <span>Test PR-AUC</span>
                <strong>{row.testPrauc.toFixed(4)}</strong>
              </div>

              <div className="model-cv">
                <span>개발 CV PR-AUC</span>
                <strong>{row.cvPrauc.toFixed(4)}</strong>
              </div>

              <div className="model-detection">
                <span>고장 180초 이내 구간에서 경보한 사건</span>
                <strong>
                  {detected}
                  <small> / {row.testPairs}건</small>
                </strong>

                <div
                  className="model-event-grid"
                  aria-label={`${row.testPairs}건 중 ${detected}건 탐지`}
                >
                  {Array.from({ length: row.testPairs }, (_, index) => (
                    <span
                      key={index}
                      className={index < detected ? 'event-detected' : ''}
                    />
                  ))}
                </div>

                <p>
                  탐지 {(row.detectionRate * 100).toFixed(1)}%
                  {' · '}
                  미탐지 {row.testPairs - detected}건
                </p>
              </div>

              <div className="model-normal-alert">
                <span>정상창 경보율</span>
                <strong>{(row.normalAlertRate * 100).toFixed(1)}%</strong>
                <div className="bar-track">
                  <div
                    className="bar-fill normal-fill"
                    style={{ width: `${row.normalAlertRate * 100}%` }}
                  />
                </div>
              </div>

              <div className="model-threshold">
                <span>검증에서 선택한 임계값</span>
                <strong>{row.threshold.toFixed(6)}</strong>
              </div>
            </article>
          )
        })}
      </div>

      <p className="grid-disclaimer">
        작은 칸은 탐지 건수의 집계 표현입니다. 특정 사건의 식별자·순서가 아닙니다.
      </p>

      <div className="model-notes">
        <div>
          <span>PR-AUC를 읽을 때</span>
          <p>
            PR-AUC는 정확도나 고장 확률이 아닙니다. 패턴 모델의 Test PR-AUC가
            가장 높아도 현재 선택 임계값에서의 탐지는 1건입니다.
          </p>
        </div>
        <div>
          <span>정상 경보 0%를 읽을 때</span>
          <p>
            고장 탐지 결과를 함께 보아야 합니다. 현재 결합 모델은 정상창
            경보가 없지만 고장 탐지도 없습니다.
          </p>
        </div>
      </div>

      <div className="interpretation">
        <span>현재 결과의 활용 범위</span>
        <p>
          완성된 현장 고장예측 시스템이 아니라, 전조 후보와 모델의 가능성 및
          한계를 비교하는 단계입니다. 새로운 사건과 실제 운영시간 기준의
          추가 검증이 필요합니다.
        </p>
      </div>

      <p className="source-note">
        출처: 21_MODEL_COMPARISON.csv · 개발 {rows[0].devPairs}쌍,
        Test {rows[0].testPairs}쌍
        <br />
        Test 양성 표본 비율: {(rows[0].positiveRate * 100).toFixed(1)}%
        {' · '}고장 사건 비율과는 다른 지표입니다.
        <br />
        ‘180초 이내 경보’와 ‘180초 이상 사전 경보’는 다른 지표입니다.
        정상창 경보율은 실제 운영시간당 오경보 횟수가 아닙니다.
      </p>
    </section>
  )
}

export default ModelComparison