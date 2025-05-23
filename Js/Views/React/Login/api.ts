
// 做最简单的一版本登录
import axios from 'axios'
import queryString from '../../../utils/queryString'

const loginAPIv1 = async (params: { username: string, password: string }) => {
    const str = queryString.stringify(params)
    return await axios.get('/vn/login?' + str)
}

const updateUserInfoAPI = async (params: any) => {
    return await axios.post('/vn/updateUserInfo', params, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })
}

const getDefatilsUserInfoAPI = async () => {
    return await axios.get('/vn/userInfo')
}

const getAvatarSrc = (p: string | undefined) => {
    if (!p) return undefined;
    return 'https://sparrowui.cn/translate/vn/pifi/' + p
}

export {
    loginAPIv1,
    updateUserInfoAPI,
    getAvatarSrc,
    getDefatilsUserInfoAPI
}