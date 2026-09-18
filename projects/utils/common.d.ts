export interface CommonLogin {
  (userType?: string): Promise<void>;
  test: () => Promise<void>;
  hehe: () => Promise<void>;
  standard_user: () => Promise<void>;
  locked_out_user: () => Promise<void>;
  problem_user: () => Promise<void>;
  performance_glitch_user: () => Promise<void>;
  error_user: () => Promise<void>;
  visual_user: () => Promise<void>;
  [key: string]: any;
}

export interface CommonUtils {
  login: CommonLogin;
  logout: () => Promise<void>;
}

declare const common: CommonUtils;
export = common;
