import React, { Component } from 'react';
import {
	StyleSheet,
	Text,
	View,
	TextInput,
	Keyboard,
	TouchableOpacity,
	ScrollView,
	KeyboardAvoidingView,
	Image,
	Platform,
	Alert,
	Dimensions,
	LayoutAnimation,
	TouchableWithoutFeedback
} from 'react-native';
import * as API from '../API'
import CONFIG from './CONFIG';
import AppAssets from '../assets/AppAssets.js';

const DIMENSIONS = Dimensions.get('window');
const HEIGHT = DIMENSIONS.height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
		width: '100%',
    backgroundColor: 'lightblue',
		justifyContent: 'space-between',
    alignItems: 'center',
  },
	header: {
		// placeholder if need specific header style
		width: '100%',
	},
	headerText: {
		fontSize: 24,
		alignSelf: 'center',
		fontWeight: 'bold'
	},
	topHalf: {
		width: '100%',
		backgroundColor: 'green'
	},
	bottomHalf: {
		marginBottom: 40,
		justifyContent: 'flex-end',
	},
	days: {
		fontSize: 15,
		alignSelf: 'center',
		// fontWeight: 'bold',
		color: 'white'
	},
	inputZipField: {
		height: 25,
		width: 50,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'lightgrey',
		borderRadius: 3,
	},
	paragraphText: {
		fontSize: 15,
		alignSelf: 'center',
		fontWeight: 'bold'
	},
	loadingIcon: {
		// alignSelf: 'center',
		resizeMode: 'contain'
	},
	toggleIcon: {
		height: 30,
		width: 30,
		borderRadius: 15,
		backgroundColor: 'green',
		alignItems: 'center',
		justifyContent: 'center'
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		alignItems: 'center'
	},
	infoText: {
		color: 'white',
		fontSize: 18
	},
	table: {
		backgroundColor: 'transparent',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 10,
		borderTopWidth: 0.5,
		borderColor: 'white'
	}
});

const LinearSlideAnimation = {
  duration: 250,
  create: {
    type: LayoutAnimation.Types.linear,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
};

class Home extends Component {
	constructor(props) {
		super(props);
		this.state = {
			zipcode: `11201`,
			city: '',
			temperature: '',
			currentWeather: '',
			timezone: 0,
			daysToShow: [],
			dailyData: [],
			unitToConvert: 'Fahrenheit',
			loading: true,
			sunriseDiffMins: 0,
			sunsetDiffMins: 0,
			keyboardUp: false
		}
	}

	async componentDidMount() {

		this.keyboardDidShowListener = Keyboard.addListener('keyboardWillShow', this.keyboardDidShow.bind(this));
    this.keyboardDidHideListener = Keyboard.addListener('keyboardWillHide', this.keyboardDidHide.bind(this));

		const { zipcode } = this.state;
		await this.fetchWeatherResponse()
		this.startInterval()
	}

	componentDidUpdate() {
		LayoutAnimation.configureNext(LinearSlideAnimation);
	}

	fetchWeatherResponse = async () => {
		const { zipcode } = this.state;
		this.setState({ loading: true })
		const weatherResponse = await API.queryWeather(zipcode)
		if (!weatherResponse.error) {
			const { city, list } = weatherResponse;
			const { name, sunrise, sunset, timezone } = city;
			this.calculateSunTimes(sunrise, sunset);
			let daysToShow = [];
			let dailyData = [];
			for (let i = 0; i < list.length; i ++) {
				const UTCtimeinZip = new Date((list[i].dt) * 1000);
				// const localTimeinZip = new Date((list[i].dt + timezone) * 1000);

				// determine day of week for each item in list
				const dayOfWeek = CONFIG.days[UTCtimeinZip.getDay()]

				// assume first item in list is current day, set temp to show on header
				if (i === 0) {
					this.setState({
						temperature: list[0].main.temp,
						currentWeather: list[0].weather[0].main
					})
				}

				if (!daysToShow.includes(dayOfWeek)) {
					// when we encounter a new day, add to array `daysToShow`
					// dayObject is what we'll use to render temp/weather info for each day
					let dayObject = {
						high: 0,
						low: 0,
						weather: ''
					}

					dayObject.high = list[i].main.temp_max;
					dayObject.low = list[i].main.temp_min;
					// show only first weather condition for future days
					dayObject.weather = list[i].weather[0].main; // can refactor to find most common weather condition in future

					// daysToShow and dailyData should be same length;
					daysToShow.push(dayOfWeek)
					dailyData.push(dayObject)
				} else {
					// edit high/low based on api findings
					const dayData = dailyData[dailyData.length - 1];
					if (list[i].main.temp_max > dayData.high) {
						dayData.high = list[i].main.temp_max;
					} else if (list[i].main.temp_min < dayData.low) {
						dayData.low = list[i].main.temp_min;
					}
				}
			}
			this.startInterval()
			this.setState({
				city: name,
				sunrise,
				sunset,
				timezone,
				daysToShow,
				dailyData,
				loading: false
			})

		} else {
			// assume api is down or invalid zip - let user input again
			const { zipcode } = this.state;
			if (weatherResponse.message && weatherResponse.message === 'api limit exceeded') {
				Alert.alert('',
					`Api limit exceeded`,
					[{ text: 'OK', onPress: () => {
						this.setState({ zipcode: '11201', loading: false })
						this.clearInterval()
					}}]
				);
			} else {
				Alert.alert('',
					`Erorr getting zipcode ${zipcode}, please try again.`,
					[{ text: 'OK', onPress: () => {
						this.setState({ zipcode: '', loading: false })
						this.clearInterval()
					}}]
				);
			}
		}
	}

	calculateSunTimes = (sunrise, sunset) => {
		const sunriseTimeUTC = new Date((sunrise) * 1000);
		const sunsetTimeUTC = new Date((sunset) * 1000);
		const now = new Date() // also UTC
		// console.log(now, sunriseTimeUTC, sunsetTimeUTC)
		const sunriseDiffMs = now - sunriseTimeUTC
		const sunriseDiffMins = Math.floor((sunriseDiffMs/1000)/60); //calc diff in mins from sunrise to now
		const sunsetDiffMs = now - sunsetTimeUTC
		const sunsetDiffMins = Math.floor((sunsetDiffMs/1000)/60); //calc diff in mins from sunrise to now
		this.setState({
			sunriseDiffMins,
			sunsetDiffMins
		})
	}

	toggleUnitToConvert = () => {
		const { unitToConvert } = this.state;
		if (unitToConvert === 'Fahrenheit') {
			this.setState({ unitToConvert: 'Celsius' })
		} else {
			this.setState({ unitToConvert: 'Fahrenheit' })
		}
	}

	convertUnits = (temp) => {
		const { unitToConvert } = this.state;
		if (unitToConvert === 'Fahrenheit') {
			return Math.round(temp * (9/5) - 459.67)
		} else {
			return Math.round(temp - 273.15)
		}
	}

	componentWillUnmount() {
		this.clearInterval()
		this.keyboardDidShowListener.remove();
		this.keyboardDidHideListener.remove();
	}

	startInterval = () => {
		this.fetchInterval = setInterval(() => this.fetchWeatherResponse(), 60000);
	}

	clearInterval = () => {
		clearInterval(this.fetchInterval)
	}

	keyboardDidShow() {
		this.setState({ keyboardUp: true });
	}

	keyboardDidHide() {
		this.setState({ keyboardUp: false});
	}


	render() {
		const {
			city,
			temperature,
			currentWeather,
			daysToShow,
			dailyData,
			unitToConvert,
			zipcode,
			loading,
			sunriseDiffMins,
			sunsetDiffMins,
			scrollViewHeight,
			keyboardUp
		} = this.state;

		if (loading) {
			return (
				<View style={[
					styles.container, {
						justifyContent: 'center',
						backgroundColor: CONFIG.background[currentWeather]
						? CONFIG.background[currentWeather] : 'lightblue'
					}]}>
					<Image source={AppAssets.loadingGif} style={styles.loadingIcon}/>
				</View>
			)
		}

		return (
			<KeyboardAvoidingView
				behavior={'padding'}
				style={[
					styles.container, {
						backgroundColor: CONFIG.background[currentWeather]
						? CONFIG.background[currentWeather] : 'lightblue'
				}]}>
				<TouchableWithoutFeedback
					onPress={() => Keyboard.dismiss()}
					style={styles.topHalf}>
					<View style={styles.header}>
						<Text
							style={[styles.headerText, { marginTop: 60 }]}
							allowFontScaling={false}>
							{city}
						</Text>
						<Text
							style={[styles.headerText]}
							allowFontScaling={false}>
							{CONFIG.weather[currentWeather]
								? CONFIG.weather[currentWeather]
								: currentWeather}
						</Text>
						<Text
							style={[styles.headerText]}
							allowFontScaling={false}>
							{this.convertUnits(temperature)}&deg;{unitToConvert.slice(0,1)}
						</Text>
					</View>
				</TouchableWithoutFeedback>
				<ScrollView
					scrollEventThrottle={10}
					overScrollMode="always"
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{
						flexGrow: 1,
						justifyContent: 'flex-end',
					}}
					style={{
						width: '100%',
						backgroundColor: 'transparent',
						height: HEIGHT - 260,
					}}>
					<View style={styles.bottomHalf}>
						{!keyboardUp && (
							<View style={{ marginBottom: 20 }}>
								{sunriseDiffMins > 0 ? (
									<Text
										allowFontScaling={false}
										style={styles.paragraphText}>
										{`Sunrise took place ${sunriseDiffMins} mins ago`}
									</Text>
								) : (
									<Text
										allowFontScaling={false}
										style={styles.paragraphText}>
										{`Sunrise in ${sunriseDiffMins * -1} mins`}
									</Text>
								)}
								{sunsetDiffMins > 0 ? (
									<Text
										allowFontScaling={false}
										style={styles.paragraphText}>
										{`Sunset took place ${sunsetDiffMins} mins ago`}
									</Text>
								) : (
									<Text
										allowFontScaling={false}
										style={styles.paragraphText}>
										{`Sunset in ${sunsetDiffMins * -1} mins`}
									</Text>
								)}
							</View>
						)}
						<View style={{ marginTop: 20 }}>
							{daysToShow.map((data, i) => (
								<View key={data} style={styles.table}>
									<Text
										style={styles.days}
										allowFontScaling={false}>
										{data}
									</Text>
									<View style={{ flexDirection: 'row' }}>
										<Text
											style={styles.days}
											allowFontScaling={false}>
											{CONFIG.weather[dailyData[i].weather]
												? CONFIG.weather[dailyData[i].weather]
												: dailyData[i].weather}
											{" "}
											{this.convertUnits(dailyData[i].high)}
											{" "}
											<Text style={{ color: 'lightgrey' }}>
												{this.convertUnits(dailyData[i].low)}
											</Text>
										</Text>
									</View>
								</View>
							))}
						</View>
					<View style={styles.infoRow}>
						<Text
							style={styles.infoText}
							allowFontScaling={false}>
							{unitToConvert === 'Fahrenheit' ? `Toggle to Celsius` : `Toggle to Fahrenheit`}
						</Text>
						<TouchableOpacity
							onPress={this.toggleUnitToConvert}>
							<View style={styles.toggleIcon}>
								<Text style={{ color: 'white' }} allowFontScaling={false}>
									&deg;{unitToConvert === 'Fahrenheit' ? `C` : `F`}
								</Text>
							</View>
						</TouchableOpacity>
					</View>
					<View style={[styles.infoRow, { marginTop: 10 }]}>
						<Text
							style={styles.infoText}
							allowFontScaling={false}>
							Input zip code
						</Text>
						<View style={styles.inputZipField}>
							<TextInput
								onFocus={() => {
									this.clearInterval()
									this.setState({ zipcode: '' })
								}}
								onChangeText={zipcode => {
									this.setState({ zipcode }, () => {
										if (zipcode.length === 5) {
											this.fetchWeatherResponse()
											Keyboard.dismiss()
										}
									})
								}}
								numberOfLines={1}
								autoCorrect={false}
								autoCapitalize="none"
								underlineColorAndroid="transparent"
								keyboardType="numeric"
								selectionColor={'black'}
								style={{ height: '100%', width: '100%' }}
								>
									<Text allowFontScaling={false} style={styles.text}>
										{zipcode}
									</Text>
								</TextInput>
							</View>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		);
	}
}

// assumptions
// weather key is only one length
// timezone stuff
// only 5 days of data
// temp max and temp min
// first return from list is current day
// only us zipcodes
// zipcodes only 5 length

export default Home
