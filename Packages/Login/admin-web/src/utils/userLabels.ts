export const STATUS_COLOR: Record<string, string> = {
  active: 'green',
  frozen: 'orange',
  cancelled: 'red',
  inactive: 'orange',
  suspended: 'orange',
  pending: 'green',
}

export const STATUS_LABEL: Record<string, string> = {
  active: '正常',
  frozen: '冻结',
  cancelled: '注销',
  inactive: '冻结',
  suspended: '冻结',
  pending: '正常',
}

export const ROLE_COLOR: Record<string, string> = {
  admin: 'purple',
  moderator: 'blue',
  user: 'default',
  beta: 'gold',
  ops: 'cyan',
}

export const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  moderator: '版主',
  user: '普通用户',
  beta: '内测',
  ops: '运营',
}

export const BETA_STATUS_LABEL: Record<number, string> = {
  0: '失效',
  1: '有效',
  2: '暂停',
}
