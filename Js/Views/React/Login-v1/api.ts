
// 做最简单的一版本登录
import axios from 'axios'
import queryString from '../../../utils/queryString'
import { globalUserStore } from './src/stores/UserStore'
const basicUrl = import.meta.env.DEV ? "" : "https://sparrowui.cn/translate"

const getCommonHeaders = () => {
    return {
        Authorization: "Bearer " + globalUserStore.token
    }
}

const loginAPIv1 = async (params: { username: string, password: string }) => {
    const str = queryString.stringify(params)
    return await axios.get(basicUrl + '/vn/login?' + str)
}

const registerAPI = async (params: {
    username: string,
    password: string,
    nickname: string,
    email?: string,
    mobile?: string,
    sex?: string,
    birthday?: string,
    remark?: string
}) => {
    return await axios.post(basicUrl + '/vn/register', params, {
        headers: {
            "Content-Type": "application/json"
        }
    })
}

const updateUserInfoAPI = async (params: any) => {
    return await axios.post(basicUrl + '/vn/updateUserInfo', params, {
        headers: {
            "Content-Type": "multipart/form-data",
            ...getCommonHeaders()
        }
    })
}

const getDefatilsUserInfoAPI = async () => {
    return await axios.get(basicUrl + '/vn/userInfo', {
        headers: {
            ...getCommonHeaders()
        }
    })
}

const getAvatarSrc = (p: string | undefined) => {
    if (!p) return undefined;
    return basicUrl + '/vn/pifi/' + p
}

// 微信扫码登录相关API
const wechatLoginAPI = async (params: { code: string }) => {
    return await axios.post(basicUrl + '/vn/wechatLogin', params, {
        headers: {
            "Content-Type": "application/json"
        }
    })
}

const getWechatQRCodeAPI = async () => {
    return await axios.get(basicUrl + '/vn/wechatQRCode')
}

const checkWechatLoginStatusAPI = async (params: { qrCodeId: string }) => {
    return await axios.get(basicUrl + '/vn/checkWechatStatus?' + queryString.stringify(params))
}

// 邮箱注册相关API
const emailRegisterAPI = async (params: {
    email: string,
    password: string,
    nickname: string,
    code: string
}) => {
    return await axios.post(basicUrl + '/vn/emailRegister', params, {
        headers: {
            "Content-Type": "application/json"
        }
    })
}

const sendEmailCodeAPI = async (params: { email: string, type: 'register' }) => {
    return await axios.post(basicUrl + '/vn/sendEmailCode', params, {
        headers: {
            "Content-Type": "application/json"
        }
    })
}

export {
    loginAPIv1,
    registerAPI,
    updateUserInfoAPI,
    getAvatarSrc,
    getDefatilsUserInfoAPI,
    wechatLoginAPI,        // 新增
    getWechatQRCodeAPI,    // 新增
    checkWechatLoginStatusAPI, // 新增
    emailRegisterAPI,      // 新增
    sendEmailCodeAPI       // 新增
}