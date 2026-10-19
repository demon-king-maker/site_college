const menuButton = document.querySelector('.menu-toggle');
const siteNavigation = document.querySelector('#site-navigation');
const yearElement = document.querySelector('#current-year');
const ideasForm = document.querySelector('#ideas-form');
const ideasPosts = document.querySelector('#ideas-posts');

if (menuButton && siteNavigation) {
	menuButton.addEventListener('click', () => {
		const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
		menuButton.setAttribute('aria-expanded', String(!isExpanded));
		menuButton.setAttribute('aria-label', isExpanded ? 'Ouvrir le menu' : 'Fermer le menu');
		siteNavigation.classList.toggle('is-open', !isExpanded);
	});

	siteNavigation.querySelectorAll('a').forEach((link) => {
		link.addEventListener('click', () => {
			menuButton.setAttribute('aria-expanded', 'false');
			menuButton.setAttribute('aria-label', 'Ouvrir le menu');
			siteNavigation.classList.remove('is-open');
		});
	});
}

if (yearElement) {
	yearElement.textContent = new Date().getFullYear();
}

if (ideasForm instanceof HTMLFormElement) {
	const ideasStatus = document.querySelector('#ideas-status');
	const ideasEmpty = document.querySelector('#ideas-empty');
	const ideasCount = document.querySelector('#ideas-count');
	const storageKey = 'college-k2-ideas';
	const storageAvailable = (() => {
		try {
			const storedIdeas = localStorage.getItem(storageKey);
			if (storedIdeas === null) {
				return [];
			}

			const parsedIdeas = JSON.parse(storedIdeas);
			if (!Array.isArray(parsedIdeas) || !parsedIdeas.every((idea) =>
				idea &&
				typeof idea.id === 'string' &&
				typeof idea.name === 'string' &&
				typeof idea.message === 'string' &&
				typeof idea.createdAt === 'string' &&
				Number.isInteger(idea.likes) &&
				Number.isInteger(idea.dislikes) &&
				(idea.userVote === null || idea.userVote === 'like' || idea.userVote === 'dislike')
			)) {
				throw new Error('Les publications enregistrées sont invalides.');
			}

			return parsedIdeas;
		} catch (error) {
			if (ideasStatus) {
				ideasStatus.textContent = `Impossible de lire les publications enregistrées : ${error instanceof Error ? error.message : 'erreur de stockage inconnue.'}`;
			}
			return null;
		}
	})();

	let ideas = storageAvailable;

	const saveIdeas = () => {
		if (ideas === null) {
			return false;
		}

		try {
			localStorage.setItem(storageKey, JSON.stringify(ideas));
			return true;
		} catch (error) {
			if (ideasStatus) {
				ideasStatus.textContent = `Impossible d’enregistrer les publications dans ce navigateur : ${error instanceof Error ? error.message : 'erreur de stockage inconnue.'}`;
			}
			return false;
		}
	};

	const renderIdeas = () => {
		if (!(ideasPosts instanceof HTMLElement) || !Array.isArray(ideas)) {
			return;
		}

		ideasPosts.replaceChildren();
		if (ideasEmpty) {
			ideasEmpty.hidden = ideas.length > 0;
		}
		if (ideasCount) {
			ideasCount.textContent = `${ideas.length} publication${ideas.length === 1 ? '' : 's'}`;
		}

		ideas.forEach((idea) => {
			const article = document.createElement('article');
			article.className = 'idea-post';

			const header = document.createElement('div');
			header.className = 'idea-post-header';
			const author = document.createElement('h3');
			author.textContent = idea.name || 'Anonyme';
			const date = document.createElement('time');
			date.dateTime = idea.createdAt;
			date.textContent = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(idea.createdAt));
			header.append(author, date);

			const message = document.createElement('p');
			message.className = 'idea-post-message';
			message.textContent = idea.message;

			const reactions = document.createElement('div');
			reactions.className = 'idea-reactions';
			[
				{ type: 'like', label: '👍 Pouce bleu', count: idea.likes },
				{ type: 'dislike', label: '👎 Pouce rouge', count: idea.dislikes }
			].forEach(({ type, label, count }) => {
				const button = document.createElement('button');
				button.className = `idea-reaction idea-reaction-${type}`;
				button.type = 'button';
				button.dataset.ideaId = idea.id;
				button.dataset.vote = type;
				button.setAttribute('aria-pressed', String(idea.userVote === type));
				button.setAttribute('aria-label', `${label}, ${count} vote${count === 1 ? '' : 's'}`);
				button.textContent = `${label} · ${count}`;
				reactions.append(button);
			});

			article.append(header, message, reactions);
			ideasPosts.append(article);
		});
	};

	if (ideas === null) {
		ideasForm.querySelectorAll('input, textarea, button').forEach((control) => {
			control.disabled = true;
		});
	} else {
		renderIdeas();
	}

	ideasForm.addEventListener('submit', (event) => {
		event.preventDefault();

		if (!Array.isArray(ideas)) {
			return;
		}

		const formData = new FormData(ideasForm);
		const name = String(formData.get('name') ?? '').trim();
		const message = String(formData.get('message') ?? '').trim();
		if (!message) {
			if (ideasStatus) {
				ideasStatus.textContent = 'Écrivez votre idée avant de la publier.';
			}
			return;
		}

		const newIdea = {
			id: crypto.randomUUID(),
			name,
			message,
			createdAt: new Date().toISOString(),
			likes: 0,
			dislikes: 0,
			userVote: null
		};
		ideas.unshift(newIdea);

		if (saveIdeas()) {
			ideasForm.reset();
			renderIdeas();
			if (ideasStatus) {
				ideasStatus.textContent = 'Votre idée a été publiée dans ce navigateur.';
			}
		} else {
			ideas.shift();
		}
	});

	if (ideasPosts instanceof HTMLElement) {
		ideasPosts.addEventListener('click', (event) => {
			const target = event.target;
			if (!(target instanceof HTMLButtonElement) || !Array.isArray(ideas)) {
				return;
			}

			const idea = ideas.find((item) => item.id === target.dataset.ideaId);
			const vote = target.dataset.vote;
			if (!idea || (vote !== 'like' && vote !== 'dislike')) {
				return;
			}

			const previousVote = idea.userVote;
			const previousLikes = idea.likes;
			const previousDislikes = idea.dislikes;
			if (previousVote === vote) {
				idea[vote === 'like' ? 'likes' : 'dislikes'] -= 1;
				idea.userVote = null;
			} else {
				if (previousVote) {
					idea[previousVote === 'like' ? 'likes' : 'dislikes'] -= 1;
				}
				idea[vote === 'like' ? 'likes' : 'dislikes'] += 1;
				idea.userVote = vote;
			}

			if (saveIdeas()) {
				renderIdeas();
			} else {
				idea.userVote = previousVote;
				idea.likes = previousLikes;
				idea.dislikes = previousDislikes;
			}
		});
	}
}
