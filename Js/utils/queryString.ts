type QueryParams = Record<string, string | number | boolean>;

function stringify(params: QueryParams): string {
    const keyValuePairs = Object.entries(params)
        .filter(([, value]) => typeof value !== 'undefined')
        .map(([key, value]) =>
            encodeURIComponent(key) + '=' + encodeURIComponent(value.toString())
        );
    return keyValuePairs.join('&');
}

function parse(queryString: string): QueryParams {
    const params: QueryParams = {};
    queryString
        .substring(1)
        .split('&')
        .map((keyValue) => keyValue.split('='))
        .forEach(([key, value]) => {
            if (value === undefined) {
                return;
            }
            const decodedKey = decodeURIComponent(key);
            const decodedValue = decodeURIComponent(value);
            const maybeNumber = Number(decodedValue);
            params[decodedKey] =
                isNaN(maybeNumber) || /\s/.test(decodedValue)
                    ? decodedValue
                    : maybeNumber;
        });
    return params;
}

const queryString = {stringify, parse}
export default queryString