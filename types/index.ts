
export interface Language {
  name: string;
  code: string;
}

export interface Voice {
  name: string;
  id: string;
}

export type JobStatus = 'IDLE' | 'UPLOADED' | 'PROCESSING' | 'COMPLETE' | 'ERROR';
