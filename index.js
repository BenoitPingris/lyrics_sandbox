const express = require('express')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const Promise = require('bluebird')
const _ = require("lodash")

const app = express()

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
		throw new Error("cheap")
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
		throw new Error("cheap")
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
		throw new Error("")
	}
	return {
		lyrics: textln(t), service: "azlyrics"
	}
}

app.get("/:artist/:song", async (req, res) => {
	let promises = [
		parolesNet(req.params.artist, req.params.song),
		lyricsMania(`${lyricsManiaUrl(req.params.song)}_lyrics_${lyricsManiaUrl(req.params.artist)}`),
		lyricsMania(`${lyricsManiaUrl(req.params.song)}_${lyricsManiaUrl(req.params.artist)}`),
		lyricsMania(`${lyricsManiaUrlAlt(req.params.song)}_lyrics_${encodeURIComponent(lyricsManiaUrlAlt(req.params.artist))}`),
		azLyrics(req.params.artist, req.params.song)
	]
	const data = await Promise.any(promises)
	res.json(data)
})

const port = process.env.PORT || 3000

app.listen(port, () => console.log(`Server is running on port ${port}`))

