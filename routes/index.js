const express = require('express');
const router = express.Router();
const axios = require('axios');
const redis = require('redis');
const moment = require('moment');
require('dotenv').config();
const REDIS_PORT = 6379;
const APIKEY = process.env.APIKEY || "509c34093897327003a7771db5ba79bc"; // env doesn't always work right for me
const ZIPAPIKEY = process.env.ZIPAPIKEY || "pyONri4mgibNkLgq8rXtsOf0NtJlZrcUMRZBSXepd9D5g6ownZnb1igWKMbTLGBH";
const client = redis.createClient(REDIS_PORT, "192.168.1.14");
const timeout = 5;


// Home
router.get('/', function (req, res, next) {
	res.render('index', { title: 'Weather Forecast' });
});

// Check for data
const checkForDataJson = async (req, res, next) => {
	try {
		await client.get('weatherCache', async (err, info) => {
			if (err) {
				return next(err);
			}

			if (info == null) {
				console.log("NULL");
				return next();
			}

			const currentCoords = req.params.coords;
			const parseData = await JSON.parse(info);
			const redisCoords = parseData.data.latitude + ',' + parseData.data.longitude;

			if (currentCoords == redisCoords) {
				return res.json({ message: 'From Cache', data: parseData });
			}
			next();
		});
	} catch (err) {
		next(err);
	}
};

// JSON FORECAST //

// Initial GET
router.get('/jsonforecast', (req, res) => {
	res.render('jsonforecast');
});

// GET with coordinates
router.get('/jsonforecast/:coords', checkForDataJson, async (req, res, next) => {
	try {
		const coords = req.params.coords;

		if(coords == "style.css") {
			// W T F
			return;
		}

		const url = `https://api.darksky.net/forecast/${APIKEY}/${coords}?exclude=hourly,minutely`;

		const result = await axios.get(url);

		let data = {
			date: Date.now(),
			data: result.data
		};

		await client.setex('weatherCache', timeout, JSON.stringify(data));
		return res.json({ message: 'From DB', data: data });
	} catch(err) {
		console.log('Error', err);
	}
});

// POST (zipcode lookup)
router.post('/jsonforecast', async (req, res, next) => {
	try {
		const zipcode = req.body.zipcode;
		const zipUrl = `https://www.zipcodeapi.com/rest/${ZIPAPIKEY}/info.json/${zipcode}/degrees`;
		const coords = await axios.get(zipUrl);
		const lat = coords.data.lat;
		const long = coords.data.lng;

		return res.redirect(`/jsonforecast/${lat},${long}`)
	} catch (err) {
		next(err);
	}
});


// REGULAR FORECAST //

// Initial GET
router.get('/forecast', (req, res) => {
	res.render('forecast');
});

// Check for data
const checkForData = async (req, res, next) => {
	try {
		await client.get('weatherCache', async (err, info) => {
			if (err) {
				return next(err);
			}

			if (info == null) {
				console.log("NULL");
				return next();
			}

			const currentCoords = req.params.coords;
			const parseData = await JSON.parse(info);
			const redisCoords = parseData.data.latitude + ',' + parseData.data.longitude;

			if (currentCoords == redisCoords) {
				let days = parseForecast(parseData);
				return res.render("dailyforecast", {moment, days});

			}
			next();
		});
	} catch (err) {
		next(err);
	}
};


// GET with coordinates
router.get('/forecast/:coords', checkForData, async (req, res, next) => {
	try {
		const coords = req.params.coords;

		if(coords == "style.css") {
			// W T F
			return;
		}

		const url = `https://api.darksky.net/forecast/${APIKEY}/${coords}?exclude=hourly,minutely`;

		const result = await axios.get(url);

		let data = {
			date: Date.now(),
			data: result.data
		};

		await client.setex('weatherCache', timeout, JSON.stringify(data));

		let days = parseForecast(data);
		return res.render("dailyforecast", {moment, days});
	} catch(err) {
		console.log('Error', err);
	}
});

const parseForecast = (data) => {
	// Prepare the cards
	const days = [];

	console.log(moment(Date.now()).format('dddd, MMM D'));

	for(day of data.data.daily.data) {
		let today = {
			time: day.time,
			summary: day.summary,
			sunrise: day.sunriseTime,
			sunset: day.sunsetTime,
			high: day.temperatureMax,
			low: day.temperatureMin,
			icon: day.icon
		};
		days.push(today);
	}

	return days;
}

// POST (zipcode lookup)
router.post('/forecast', async (req, res, next) => {
	try {
		const zipcode = req.body.zipcode;
		const zipUrl = `https://www.zipcodeapi.com/rest/${ZIPAPIKEY}/info.json/${zipcode}/degrees`;
		const coords = await axios.get(zipUrl);
		const lat = coords.data.lat;
		const long = coords.data.lng;

		return res.redirect(`/forecast/${lat},${long}`)
	} catch (err) {
		next(err);
	}
});


module.exports = router;
