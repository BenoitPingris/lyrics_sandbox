const express = require('express')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
// const Promise = require('bluebird')
const dotenv = require('dotenv')
const _ = require("lodash")

const app = express()

const CLIENT_ID = "hd5V5TyPE4uwvs_Y-ZUo1IFbH2xIQBrYHCJ5wmpIBCU2uyCcEkVjnGOzX9u_Uqz1"
const CLIENT_SECRET = "I4ks7n_6dDLaDZaU31I3vd3KZfQERmbI2BzLm6bzrllAO6kv07vaWy98BUQe209QoJqzHf5bWRFNSnwpwn67-g"
const CLIENT_ACCESS_TOKEN = "mmRFE8NHr013O-j23nk1DC_VaLpJLwEzCDQVlv_fA6pDdY13vI24gN52A-MHH_2Q"
const AUTH_TOKEN = "HtIogZ4gzk59zGW_tuxWu_wmdbw4a3gVAigPDS-dCYqDjGJT_WztBsAOl4mFmQmL"

async function searchGeniusLyrics(artist, song) {
	const res = await fetch(`https://api.genius.com/search?q=${encodeURI(artist)}`, {
		headers: {
			'Authorization': `Bearer ${AUTH_TOKEN}`
		}
	})
	if (!res.ok) {
		return null
	}
	const { response } = await res.json()
	for (const hit of response.hits) {
		if (_.toLower(_.deburr(hit.result.title)) == _.toLower(_.deburr(song))) {
			console.log(hit.result.url)
			return hit.result.url
		}
	}
	return null
}

async function loginGenius(accessToken) {
}

async function fetchGeniusLyrics(url) {
	const res = await (await fetch(url)).text()
	const $ = cheerio.load(res)
	let lyrics = ""
	$('div[class^="Lyrics__Container"]').each((i, elem) => {
		if ($(elem).text().length !== 0) {
			let snippet = $(elem).html()
				.replace(/<br>/g, '\n')
				.replace(/<(?!\s*br\s*\/?)[^>]+>/gi, '');
			lyrics += $('<textarea/>').html(snippet).text().trim() + '\n\n';
		}
	})
	if (!lyrics) return null
	return lyrics.trim()
}

function textln(html) {
	html.find('br').replaceWith('\n');
	html.find('script').replaceWith('');
	html.find('#video-musictory').replaceWith('');
	html.find('strong').replaceWith('');
	html = _.trim(html.text());
	html = html.replace(/\r\n\n/g, '\n');
	html = html.replace(/\t/g, '');
	html = html.replace(/\n\r\n/g, '\n');
	html = html.replace(/ +/g, ' ');
	html = html.replace(/\n /g, '\n');
	return html;
}

function lyricsUrl(text) {
	return _.kebabCase(_.trim(_.toLower(_.deburr(text))))
}

function lyricsManiaUrl(text) {
	return _.snakeCase(_.trim(_.toLower(_.deburr(text))))
}

async function genius(artist, song) {
	const pouet = await searchGeniusLyrics(artist, song)
	const rr = await fetchGeniusLyrics(pouet)
	return { lyrics: rr, service: 'genius' }
}

function lyricsManiaUrlAlt(text) {
	text = _.trim(_.toLower(text))
	text = text.replace(/\'/g, "")
	text = text.replace(/ /g, "_")
	text = text.replace(/_+/g, "_")
	return text
}

async function parolesNet(artist, title) {
	const url = `http://www.paroles.net/${lyricsUrl(artist)}/paroles-${lyricsUrl(title)}`
	const $ = cheerio.load(await (await fetch(url)).text())
	if ($('.song-text').length === 0) {
		throw new Error("No lyrics")
	}
	return {
		lyrics: textln($('.song-text')),
		service: "parolesnet"
	}
}

async function lyricsMania(urlquery) {
	const url = `http://www.lyricsmania.com/${urlquery}.html`
	const $ = cheerio.load(await (await fetch(url)).text())
	if ($('.lyrics-body').length === 0) {
		throw new Error("No lyrics")
	}
	return {
		lyrics: textln($('.lyrics-body')),
		service: "lyrics mania"
	}
}

async function azLyrics(artist, song) {
	const url = `https://azlyrics.com/lyrics/${_.toLower(_.deburr(artist.replace(/ /g, "")))}/${_.toLower(_.deburr(song.replace(/ /g, "")))}.html`
	const $ = cheerio.load(await (await fetch(url)).text())
	const t = $("body > div.container.main-page > div > div.col-xs-12.col-lg-8.text-center > div:nth-child(8)")
	if (t.length === 0) {
		throw new Error("No lyrics")
	}
	return {
		lyrics: textln(t), service: "azlyrics"
	}
}

async function genius(artist, song) {

}

app.get("/:artist/:song", async (req, res) => {
	const { artist, song } = req.params
	let promises = [
		parolesNet(artist, song),
		lyricsMania(`${lyricsManiaUrl(song)}_lyrics_${lyricsManiaUrl(artist)}`),
		lyricsMania(`${lyricsManiaUrl(song)}_${lyricsManiaUrl(artist)}`),
		lyricsMania(`${lyricsManiaUrlAlt(song)}_lyrics_${encodeURIComponent(lyricsManiaUrlAlt(artist))}`),
		azLyrics(artist, song)
	]
	try {
		const data = await Promise.allSettled(promises)

		res.json(data.filter(o => o.status === "fulfilled").map(o => ({...o.value})))
	} catch (e) {
		console.log(e)
		res.json({ error: 'Impossible de recuperer des paroles' })
	}
})

const port = process.env.PORT || 3000

app.listen(port, () => console.log(`Server is running on port ${port}`))
