var projects = [
	{
		name: 'marketOnline',
		url: 'https://github.com/shomkee/marketOnline',
		stack: 'TypeScript',
		ru: 'Витрина интернет-магазина: каталог, корзина, фильтры.',
		en: 'Online store front: catalog, cart, filters.'
	},
	{
		name: 'shopbot_tg',
		url: 'https://github.com/shomkee/shopbot_tg',
		stack: 'Python',
		ru: 'Телеграм-бот магазина: заказы, каталог, админка.',
		en: 'Telegram shop bot: orders, catalog, admin panel.'
	},
	{
		name: 'cursvalut',
		url: 'https://github.com/shomkee/cursvalut',
		stack: 'HTML/JS',
		ru: 'Курсы валют — тянет данные и считает конвертацию.',
		en: 'Currency rates — fetches data and converts.'
	},
	{
		name: 'blackhole',
		url: 'https://github.com/shomkee/blackhole',
		stack: 'HTML/CSS',
		ru: 'Экспериментальная страница с анимацией.',
		en: 'Experimental page with animation.'
	},
	{
		name: 'land',
		url: 'https://github.com/shomkee/land',
		stack: 'HTML/CSS',
		ru: 'Небольшой лендинг, свёрстан с нуля.',
		en: 'Small landing page, hand-coded.'
	}
];

var lang = localStorage.getItem('lang') || 'ru';
var btn = document.getElementById('lang');
var list = document.getElementById('list');

function drawList() {
	var html = '';
	for (var i = 0; i < projects.length; i++) {
		var p = projects[i];
		html += '<a class="card" href="' + p.url + '">' +
			'<b>' + p.name + '</b>' +
			'<span>' + (lang === 'ru' ? p.ru : p.en) + '</span>' +
			'<em>' + p.stack + '</em></a>';
	}
	list.innerHTML = html;
}

function applyLang() {
	var nodes = document.querySelectorAll('[data-ru]');
	for (var i = 0; i < nodes.length; i++) {
		nodes[i].textContent = nodes[i].getAttribute('data-' + lang);
	}
	document.documentElement.lang = lang;
	btn.textContent = lang === 'ru' ? 'EN' : 'RU';
	drawList();
}

btn.addEventListener('click', function () {
	lang = lang === 'ru' ? 'en' : 'ru';
	localStorage.setItem('lang', lang);
	applyLang();
});

// печать первой строки
var boot = document.getElementById('boot');
var text = 'whoami && cat about.md';
var n = 0;

(function type() {
	if (n > text.length) return;
	boot.textContent = text.slice(0, n++);
	setTimeout(type, 55);
})();

applyLang();
