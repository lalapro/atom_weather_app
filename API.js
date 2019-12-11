const URL = `http://api.openweathermap.org/data/2.5/forecast?id=524901&APPID=c1d0fb40222e923a2ead672b6ea4be52&zip=`

export async function queryWeather(zipcode) {
	// check connection
  try {
    const weatherResponse = await fetch(`${URL}${zipcode}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
		if (weatherResponse.status === 200) {
			let jsonResponse = await weatherResponse.text()
			jsonResponse = JSON.parse(jsonResponse)
			// console.log(jsonResponse.list.length)
			return jsonResponse
		} else if (weatherResponse.status === 429) {
			return { error: true, message: 'api limit exceeded'}
		} else {
      return false
    }
  } catch (err) {
    console.log(err);
    return false;
  }
}
