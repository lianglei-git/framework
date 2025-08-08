const searchParams = new URLSearchParams(window.location.search)

// 登录归属Id
const getGenresType = () => {
    let type = searchParams.get('genres-type')
    if (!type) {
        let isHit = searchParams.get("state")
        // 目前是可以证明为github的
        if (isHit) {
            const params = new URLSearchParams(isHit);
            type = params.get('genres-type')
        }
    }
    return type
}

console.log("GenresType: ", getGenresType())
window.genresType = getGenresType();
export {
    getGenresType
}
