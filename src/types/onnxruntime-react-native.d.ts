/**
 * Type declarations for onnxruntime-react-native
 * ONNX Runtime React Native 라이브러리의 타입 선언
 */

declare module 'onnxruntime-react-native' {
  /**
   * ONNX 추론 세션
   */
  export class InferenceSession {
    /**
     * ONNX 모델 파일에서 추론 세션 생성
     * @param path 모델 파일 경로 (로컬 URI)
     * @returns 추론 세션 프로미스
     */
    static create(path: string): Promise<InferenceSession>;

    /**
     * 추론 실행
     * @param feeds 입력 텐서 맵 (inputName -> Tensor)
     * @returns 출력 텐서 맵 (outputName -> Tensor)
     */
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;

    /**
     * 세션 리소스 해제
     */
    release(): Promise<void>;

    /**
     * 모델의 입력 이름 목록
     */
    readonly inputNames: string[];

    /**
     * 모델의 출력 이름 목록
     */
    readonly outputNames: string[];
  }

  /**
   * 텐서 (다차원 배열)
   */
  export class Tensor {
    /**
     * 텐서 생성
     * @param type 데이터 타입 ('float32', 'int32', 'uint8' 등)
     * @param data 데이터 배열
     * @param dims 텐서 차원 (shape)
     */
    constructor(
      type: 'float32' | 'int32' | 'uint8' | 'int8' | 'int64' | 'bool' | 'double' | 'uint32' | 'uint64',
      data: Float32Array | Int32Array | Uint8Array | Int8Array | BigInt64Array | Uint32Array | BigUint64Array | Float64Array,
      dims: number[]
    );

    /**
     * 텐서 데이터
     */
    readonly data: Float32Array | Int32Array | Uint8Array | Int8Array | BigInt64Array | Uint32Array | BigUint64Array | Float64Array;

    /**
     * 텐서 차원 (shape)
     */
    readonly dims: number[];

    /**
     * 데이터 타입
     */
    readonly type: string;

    /**
     * 텐서 요소의 총 개수
     */
    readonly size: number;
  }

  /**
   * ONNX Runtime 옵션
   */
  export interface SessionOptions {
    /**
     * 실행 프로바이더 목록 ('cpu', 'coreml', 'nnapi' 등)
     */
    executionProviders?: string[];

    /**
     * 그래프 최적화 레벨 (0: 비활성화, 1: 기본, 2: 확장, 99: 모두)
     */
    graphOptimizationLevel?: number;

    /**
     * 인트라 스레드 수
     */
    intraOpNumThreads?: number;

    /**
     * 인터 스레드 수
     */
    interOpNumThreads?: number;

    /**
     * 로그 레벨 (0: Verbose, 1: Info, 2: Warning, 3: Error, 4: Fatal)
     */
    logSeverityLevel?: number;
  }
}

