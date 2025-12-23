// State
let podcasts = [];
let currentPodcast = null;
let allEpisodes = [];
let filteredEpisodes = [];
let currentEpisode = null;
let currentPage = 'home';
let currentSpeed = 1;
let sleepTimer = null;
let sleepTimerEndTime = null;
let autoPlayNext = true;

// DOM Elements - Pages
const homePage = document.getElementById('homePage');
const podcastPage = document.getElementById('podcastPage');
const nowPlayingPage = document.getElementById('nowPlayingPage');
const loading = document.getElementById('loading');
const podcastsContainer = document.getElementById('podcastsContainer');

// Navigation elements
const navBackBtn = document.getElementById('navBackBtn');
const navLogo = document.getElementById('navLogo');

// Podcast detail elements
const podcastArtwork = document.getElementById('podcastArtwork');
const podcastTitle = document.getElementById('podcastTitle');
const podcastCategory = document.getElementById('podcastCategory');
const podcastDescription = document.getElementById('podcastDescription');
const podcastNetwork = document.getElementById('podcastNetwork');
const episodeSearch = document.getElementById('episodeSearch');
const episodeLoading = document.getElementById('episodeLoading');
const episodeList = document.getElementById('episodeList');

// Audio element
const audio = document.getElementById('audio');

// Mini player elements
const miniPlayer = document.getElementById('miniPlayer');
const miniPlayerContent = document.getElementById('miniPlayerContent');
const miniPlayerArtwork = document.getElementById('miniPlayerArtwork');
const miniPlayerTitle = document.getElementById('miniPlayerTitle');
const miniPlayerPodcast = document.getElementById('miniPlayerPodcast');
const miniPlayPause = document.getElementById('miniPlayPause');
const miniPlayIcon = document.getElementById('miniPlayIcon');
const miniPauseIcon = document.getElementById('miniPauseIcon');
const miniSpeed = document.getElementById('miniSpeed');
const miniRewind = document.getElementById('miniRewind');
const miniForward = document.getElementById('miniForward');
const miniPlayerClose = document.getElementById('miniPlayerClose');
const miniProgressFill = document.getElementById('miniProgressFill');

// Now Playing page elements
const nowPlayingArtwork = document.getElementById('nowPlayingArtwork');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingPodcast = document.getElementById('nowPlayingPodcast');
const nowPlayingProgressBar = document.getElementById('nowPlayingProgressBar');
const nowPlayingProgressFill = document.getElementById('nowPlayingProgressFill');
const nowPlayingProgressHandle = document.getElementById('nowPlayingProgressHandle');
const nowPlayingCurrentTime = document.getElementById('nowPlayingCurrentTime');
const nowPlayingDuration = document.getElementById('nowPlayingDuration');
const nowPlayingPlayPause = document.getElementById('nowPlayingPlayPause');
const nowPlayingPlayIcon = document.getElementById('nowPlayingPlayIcon');
const nowPlayingPauseIcon = document.getElementById('nowPlayingPauseIcon');
const nowPlayingRewind = document.getElementById('nowPlayingRewind');
const nowPlayingForward = document.getElementById('nowPlayingForward');
const nowPlayingVolume = document.getElementById('nowPlayingVolume');
const volumePercent = document.getElementById('volumePercent');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    setupRouting();
    await loadPodcasts();
}

// URL Routing System
function setupRouting() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (e.state) {
            handleRoute(e.state.page, e.state.podcastId, false);
        } else {
            handleRoute('home', null, false);
        }
    });
    
    // Handle initial page load with URL
    handleInitialRoute();
}

function handleInitialRoute() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p);
    
    if (parts.length === 0 || parts[0] === '') {
        // Home page
        updateURL('home', null, false);
    } else if (parts[0] === 'podcast' && parts[1]) {
        // Podcast detail page
        const podcastSlug = parts[1];
        // Wait for podcasts to load, then open the podcast
        const checkPodcasts = setInterval(() => {
            if (podcasts.length > 0) {
                clearInterval(checkPodcasts);
                const podcast = podcasts.find(p => slugify(p.name) === podcastSlug || p.id === parseInt(podcastSlug));
                if (podcast) {
                    openPodcast(podcast.id);
                }
            }
        }, 100);
    }
}

function handleRoute(page, podcastId, updateHistory = true) {
    switch (page) {
        case 'home':
            goHome();
            break;
        case 'podcast':
            if (podcastId) {
                openPodcast(podcastId);
            }
            break;
        // Note: 'nowplaying' removed - it's a sidebar, not a page/route
    }
}

function updateURL(page, podcastId = null, addToHistory = true) {
    let url = '/';
    let state = { page };
    
    if (page === 'podcast' && podcastId) {
        const podcast = podcasts.find(p => p.id === podcastId);
        if (podcast) {
            const slug = slugify(podcast.name);
            url = `/podcast/${slug}`;
            state.podcastId = podcastId;
        }
    }
    // Note: 'nowplaying' removed - sidebar doesn't need URL
    
    if (addToHistory) {
        window.history.pushState(state, '', url);
    } else {
        window.history.replaceState(state, '', url);
    }
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function setupEventListeners() {
    // Navigation
    navBackBtn.addEventListener('click', handleBackButton);
    navLogo.addEventListener('click', () => {
        goHome();
        updateNavigation();
    });
    
    // Close Now Playing button (desktop sidebar)
    document.getElementById('closeNowPlaying')?.addEventListener('click', closeNowPlaying);
    
    // Mini player controls
    miniPlayerContent.addEventListener('click', openNowPlaying);
    miniPlayPause.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlayPause();
    });
    miniSpeed.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleSpeed();
    });
    miniRewind.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.currentTime = Math.max(0, audio.currentTime - 15);
    });
    miniForward.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 30);
    });
    miniPlayerClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMiniPlayer();
    });
    
    // Now Playing controls
    nowPlayingPlayPause.addEventListener('click', togglePlayPause);
    nowPlayingRewind.addEventListener('click', () => audio.currentTime = Math.max(0, audio.currentTime - 15));
    nowPlayingForward.addEventListener('click', () => audio.currentTime = Math.min(audio.duration, audio.currentTime + 30));
    nowPlayingProgressBar.addEventListener('click', seek);
    nowPlayingVolume.addEventListener('input', updateVolume);
    
    // Speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const speed = parseFloat(btn.dataset.speed);
            setSpeed(speed);
        });
    });
    
    // Sleep timer buttons
    document.querySelectorAll('.timer-btn[data-minutes]').forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            setSleepTimer(minutes);
        });
    });
    
    document.getElementById('cancelTimer')?.addEventListener('click', cancelSleepTimer);
    
    // Refresh button
    setTimeout(() => {
        const refreshBtn = document.getElementById('refreshEpisodes');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshEpisodes);
        }
    }, 100);
    
    episodeSearch.addEventListener('input', searchEpisodes);
    
    // Audio events
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('play', () => {
        miniPlayIcon.classList.add('hidden');
        miniPauseIcon.classList.remove('hidden');
        nowPlayingPlayIcon.classList.add('hidden');
        nowPlayingPauseIcon.classList.remove('hidden');
    });
    audio.addEventListener('pause', () => {
        miniPlayIcon.classList.remove('hidden');
        miniPauseIcon.classList.add('hidden');
        nowPlayingPlayIcon.classList.remove('hidden');
        nowPlayingPauseIcon.classList.add('hidden');
    });
    audio.addEventListener('ended', handleEpisodeEnded);
}

// Navigation
function showPage(page) {
    // Don't hide pages - just manage which is active for navigation purposes
    if (page === homePage) {
        homePage.classList.add('active');
        podcastPage.classList.remove('active');
        currentPage = 'home';
    } else if (page === podcastPage) {
        homePage.classList.remove('active');
        podcastPage.classList.add('active');
        currentPage = 'podcast';
    }
    // Note: Now Playing is NEVER shown as a page, only as a sidebar
    
    updateNavigation();
    
    // Now Playing is always a sidebar, never hides main content
    if (currentEpisode && audio.src) {
        showMiniPlayer();
    }
}

function updateNavigation() {
    if (currentPage === 'home') {
        navBackBtn.classList.add('hidden');
    } else {
        navBackBtn.classList.remove('hidden');
    }
}

function handleBackButton() {
    window.history.back();
}

function goHome() {
    showPage(homePage);
    currentPodcast = null;
    allEpisodes = [];
    filteredEpisodes = [];
    updateURL('home');
}

function refreshEpisodes() {
    if (!currentPodcast) return;
    
    const refreshBtn = document.getElementById('refreshEpisodes');
    if (refreshBtn) {
        const originalHTML = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> Refreshing...';
        refreshBtn.disabled = true;
    }
    
    loadEpisodes().finally(() => {
        if (refreshBtn) {
            setTimeout(() => {
                refreshBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg> Refresh';
                refreshBtn.disabled = false;
            }, 500);
        }
    });
}

// Load Podcasts
async function loadPodcasts() {
    try {
        console.log('📥 Starting to load podcasts...');
        const text = await fetchWithFallback('https://raw.githubusercontent.com/Fleishigs/Podcast-list/main/podcasts.json');
        console.log('✅ Got response, cleaning JSON...');
        
        const cleanedText = text.replace(/,(\s*[\]}])/g, '$1');
        const data = JSON.parse(cleanedText);
        
        console.log('✅ Parsed JSON:', data);
        console.log('📊 Number of podcasts:', data.podcasts?.length);
        
        if (data && data.podcasts && Array.isArray(data.podcasts)) {
            podcasts = data.podcasts;
            console.log(`✅ Loaded ${podcasts.length} podcasts`);
            
            renderPodcasts();
            fetchAllPodcastArtwork();
        } else {
            throw new Error('Invalid data format - missing podcasts array');
        }
    } catch (error) {
        console.error('❌ Error loading podcasts:', error);
        loading.innerHTML = `
            <div class="empty-state">
                <h3>Couldn't load podcasts</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

async function fetchWithFallback(url) {
    console.log('🔍 Fetching:', url);
    
    const methods = [
        {
            name: 'CorsProxy (Primary)',
            fn: () => fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`).then(r => r.text())
        },
        {
            name: 'AllOrigins',
            fn: () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`).then(r => r.text())
        },
        {
            name: 'Direct',
            fn: () => fetch(url).then(r => r.text())
        }
    ];
    
    for (const method of methods) {
        try {
            console.log(`  ⏳ Trying ${method.name}...`);
            const result = await method.fn();
            console.log(`  ✅ Success with ${method.name}`);
            return result;
        } catch (error) {
            console.warn(`  ❌ ${method.name} failed:`, error.message);
        }
    }
    throw new Error('All fetch methods failed');
}

// Fetch artwork from RSS feeds for all podcasts
async function fetchAllPodcastArtwork() {
    console.log(`🎨 Fetching RSS artwork for ALL ${podcasts.length} podcasts in parallel...`);
    
    // Process 5 podcasts at a time for maximum speed
    const batchSize = 5;
    let processedCount = 0;
    
    for (let i = 0; i < podcasts.length; i += batchSize) {
        const batch = podcasts.slice(i, i + batchSize);
        
        // Process batch in parallel
        const promises = batch.map(async (podcast) => {
            try {
                const podcastNum = podcasts.indexOf(podcast) + 1;
                console.log(`  🔍 [${podcastNum}/${podcasts.length}] ${podcast.name}`);
                
                const xmlText = await fetchRSSFeed(podcast.rss_url);
                const { channelInfo } = parseRSSFeed(xmlText);
                
                if (channelInfo.artwork) {
                    console.log(`  ✅ [${podcastNum}] ${podcast.name}`);
                    podcast.rssArtwork = channelInfo.artwork;
                    
                    const card = document.querySelector(`[data-podcast-id="${podcast.id}"] .podcast-artwork`);
                    if (card) {
                        card.classList.remove('loading-artwork');
                        card.innerHTML = `<img src="${channelInfo.artwork}" alt="${escapeHtml(podcast.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<span style=\\'font-size: 3rem;\\'>🎙️</span>';">`;
                    }
                } else {
                    console.log(`  ⚠️ [${podcastNum}] No artwork for ${podcast.name}`);
                    const card = document.querySelector(`[data-podcast-id="${podcast.id}"] .podcast-artwork`);
                    if (card) {
                        card.classList.remove('loading-artwork');
                    }
                }
                processedCount++;
            } catch (error) {
                const podcastNum = podcasts.indexOf(podcast) + 1;
                console.warn(`  ❌ [${podcastNum}] ${podcast.name}: ${error.message}`);
                const card = document.querySelector(`[data-podcast-id="${podcast.id}"] .podcast-artwork`);
                if (card) {
                    card.classList.remove('loading-artwork');
                }
                processedCount++;
            }
        });
        
        // Wait for all in batch to complete
        await Promise.all(promises);
        
        console.log(`📊 Progress: ${processedCount}/${podcasts.length} podcasts processed`);
        
        // Very short delay between batches (only if there are more batches)
        if (i + batchSize < podcasts.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    console.log(`✅ Finished fetching ALL ${podcasts.length} RSS artwork images!`);
}

// Render Podcasts
function renderPodcasts() {
    loading.classList.add('hidden');
    podcastsContainer.classList.remove('hidden');
    
    console.log('🎨 Rendering podcasts with RSS artwork loading...');
    
    podcastsContainer.innerHTML = podcasts.map(podcast => {
        return `
            <div class="podcast-card" data-podcast-id="${podcast.id}" onclick="openPodcast(${podcast.id})">
                <div class="podcast-artwork loading-artwork">
                    <span style="font-size: 3rem;">🎙️</span>
                </div>
                <div class="podcast-details">
                    <h2 class="podcast-name">${escapeHtml(podcast.name)}</h2>
                    <span class="podcast-category">${escapeHtml(podcast.category)}</span>
                    <p class="podcast-description">${escapeHtml(podcast.description)}</p>
                    ${podcast.network ? `<p class="podcast-network">${escapeHtml(podcast.network)}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Open Podcast
async function openPodcast(id) {
    currentPodcast = podcasts.find(p => p.id === id);
    if (!currentPodcast) return;
    
    showPage(podcastPage);
    updateURL('podcast', id);
    
    episodeSearch.value = '';
    episodeList.innerHTML = '';
    episodeLoading.style.display = 'flex';
    
    await loadEpisodes();
}

async function loadEpisodes() {
    if (!currentPodcast) return;
    
    try {
        const xmlText = await fetchRSSFeed(currentPodcast.rss_url);
        const { episodes, channelInfo } = parseRSSFeed(xmlText);
        
        const rssArtwork = channelInfo.artwork || currentPodcast.artwork_url;
        const rssDescription = channelInfo.description || currentPodcast.description;
        
        if (rssArtwork) {
            podcastArtwork.innerHTML = `<img src="${rssArtwork}" alt="${currentPodcast.name}" onerror="this.parentElement.innerHTML='🎙️'">`;
        } else {
            podcastArtwork.textContent = '🎙️';
        }
        
        currentPodcast.displayArtwork = rssArtwork;
        
        podcastTitle.textContent = currentPodcast.name;
        podcastCategory.textContent = currentPodcast.category;
        podcastDescription.textContent = rssDescription;
        podcastNetwork.textContent = currentPodcast.network || '';
        podcastNetwork.style.display = currentPodcast.network ? 'block' : 'none';
        
        if (episodes.length === 0) {
            episodeLoading.style.display = 'none';
            episodeList.innerHTML = `
                <div class="empty-state">
                    <h3>No episodes found</h3>
                    <p>This podcast doesn't have any episodes yet.</p>
                </div>
            `;
            return;
        }
        
        allEpisodes = episodes;
        filteredEpisodes = episodes;
        renderEpisodes();
        
    } catch (error) {
        console.error('Error loading episodes:', error);
        episodeLoading.style.display = 'none';
        
        if (currentPodcast.artwork_url) {
            podcastArtwork.innerHTML = `<img src="${currentPodcast.artwork_url}" alt="${currentPodcast.name}">`;
        } else {
            podcastArtwork.textContent = '🎙️';
        }
        podcastTitle.textContent = currentPodcast.name;
        podcastCategory.textContent = currentPodcast.category;
        podcastDescription.textContent = currentPodcast.description;
        podcastNetwork.textContent = currentPodcast.network || '';
        
        episodeList.innerHTML = `
            <div class="empty-state">
                <h3>Couldn't load episodes</h3>
                <p>The RSS feed may be unavailable.</p>
                <p style="font-size: 0.9rem; margin-top: 8px;">${error.message}</p>
            </div>
        `;
    }
}

async function fetchRSSFeed(url) {
    console.log('🔍 Fetching RSS feed:', url);
    
    const proxies = [
        {
            url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            name: 'AllOrigins'
        },
        {
            url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            name: 'AllOrigins-JSON',
            parseJSON: true
        },
        {
            url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
            name: 'CorsProxy'
        },
        {
            url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`,
            name: 'RSS2JSON',
            parseJSON: true,
            convertFromJSON: true
        },
        {
            url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            name: 'CodeTabs'
        },
        {
            url: url,
            name: 'Direct'
        }
    ];
    
    let lastError = null;
    
    for (const proxy of proxies) {
        try {
            console.log(`  ⏳ Trying ${proxy.name}...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            
            const response = await fetch(proxy.url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/rss+xml, application/xml, text/xml, application/json, */*'
                },
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            let text;
            
            if (proxy.parseJSON) {
                const json = await response.json();
                if (proxy.convertFromJSON && json.items) {
                    text = convertRSS2JSONToXML(json);
                } else if (json.contents) {
                    text = json.contents;
                } else {
                    throw new Error('Unexpected JSON format');
                }
            } else {
                text = await response.text();
            }
            
            if (!text || text.trim().length === 0) {
                throw new Error('Empty response');
            }
            
            if (!text.trim().startsWith('<')) {
                throw new Error('Response is not XML');
            }
            
            if (!text.includes('<rss') && !text.includes('<feed') && !text.includes('<?xml')) {
                throw new Error('Response is not RSS/Atom feed');
            }
            
            console.log(`  ✅ Success with ${proxy.name}`);
            return text;
            
        } catch (error) {
            console.warn(`  ❌ ${proxy.name} failed:`, error.message);
            lastError = error;
            continue;
        }
    }
    
    throw new Error(`Could not fetch RSS feed after trying all methods. Last error: ${lastError?.message || 'Unknown error'}`);
}

function convertRSS2JSONToXML(json) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>';
    xml += `<title>${escapeXml(json.feed?.title || 'Podcast')}</title>`;
    xml += `<description>${escapeXml(json.feed?.description || '')}</description>`;
    if (json.feed?.image) {
        xml += `<itunes:image href="${escapeXml(json.feed.image)}"/>`;
    }
    
    json.items.forEach(item => {
        xml += '<item>';
        xml += `<title>${escapeXml(item.title || '')}</title>`;
        xml += `<description>${escapeXml(item.description || '')}</description>`;
        xml += `<pubDate>${escapeXml(item.pubDate || '')}</pubDate>`;
        if (item.enclosure?.link) {
            xml += `<enclosure url="${escapeXml(item.enclosure.link)}" type="${escapeXml(item.enclosure.type || 'audio/mpeg')}"/>`;
        }
        xml += '</item>';
    });
    
    xml += '</channel></rss>';
    return xml;
}

function escapeXml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function parseRSSFeed(xmlText) {
    try {
        xmlText = xmlText.trim().replace(/^\uFEFF/, '');
        
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        
        const parserError = xml.querySelector('parsererror');
        if (parserError) {
            console.error('XML Parser Error:', parserError.textContent);
            throw new Error('XML parsing failed - feed may be malformed');
        }
        
        const channel = xml.querySelector('channel');
        if (!channel) {
            throw new Error('No channel element found in RSS feed');
        }
        
        const channelInfo = {
            artwork: null,
            description: null
        };
        
        let itunesImage = channel.querySelector('itunes\\:image');
        if (!itunesImage) {
            itunesImage = Array.from(channel.getElementsByTagName('itunes:image'))[0];
        }
        if (itunesImage) {
            channelInfo.artwork = itunesImage.getAttribute('href');
        }
        
        if (!channelInfo.artwork) {
            const imageUrl = channel.querySelector('image url');
            if (imageUrl) {
                channelInfo.artwork = imageUrl.textContent.trim();
            }
        }
        
        const desc = channel.querySelector('description');
        if (desc) {
            channelInfo.description = stripHtml(desc.textContent).trim();
        }
        
        const items = xml.querySelectorAll('item');
        if (items.length === 0) {
            console.warn('No items found in RSS feed');
        }
        
        const episodes = Array.from(items).slice(0, 100).map(item => {
            let audioUrl = '';
            
            const enclosure = item.querySelector('enclosure');
            if (enclosure) {
                audioUrl = enclosure.getAttribute('url') || '';
            }
            
            if (!audioUrl) {
                const mediaContent = item.querySelector('media\\:content');
                if (mediaContent) {
                    audioUrl = mediaContent.getAttribute('url') || '';
                }
            }
            
            if (!audioUrl) {
                const mediaContentAlt = Array.from(item.getElementsByTagName('media:content'))[0];
                if (mediaContentAlt) {
                    audioUrl = mediaContentAlt.getAttribute('url') || '';
                }
            }
            
            let duration = '';
            let itunesDuration = item.querySelector('itunes\\:duration');
            if (!itunesDuration) {
                itunesDuration = Array.from(item.getElementsByTagName('itunes:duration'))[0];
            }
            if (itunesDuration) {
                duration = itunesDuration.textContent.trim();
            }
            
            return {
                title: item.querySelector('title')?.textContent?.trim() || 'Untitled Episode',
                description: item.querySelector('description')?.textContent?.trim() || '',
                pubDate: item.querySelector('pubDate')?.textContent?.trim() || '',
                audioUrl: audioUrl,
                duration: duration
            };
        }).filter(ep => ep.audioUrl);
        
        console.log(`Parsed ${episodes.length} episodes with audio`);
        
        return { episodes, channelInfo };
        
    } catch (error) {
        console.error('RSS parsing error:', error);
        throw error;
    }
}

function renderEpisodes() {
    episodeLoading.style.display = 'none';
    
    if (filteredEpisodes.length === 0) {
        episodeList.innerHTML = `
            <div class="empty-state">
                <h3>No episodes match your search</h3>
                <p>Try a different search term</p>
            </div>
        `;
        return;
    }
    
    episodeList.innerHTML = filteredEpisodes.map((episode, index) => {
        const cleanDesc = stripHtml(episode.description).substring(0, 250);
        const date = formatDate(episode.pubDate);
        
        return `
            <div class="episode-item">
                <h3 class="episode-title">${escapeHtml(episode.title)}</h3>
                <div class="episode-meta">
                    ${date ? `<span>${date}</span>` : ''}
                    ${episode.duration ? `<span>• ${formatDuration(episode.duration)}</span>` : ''}
                </div>
                ${cleanDesc ? `<p class="episode-description">${escapeHtml(cleanDesc)}${episode.description.length > 250 ? '...' : ''}</p>` : ''}
                <div class="episode-actions">
                    <button class="btn btn-primary" onclick="playEpisode(${index})">
                        ▶ Play
                    </button>
                    <button class="btn btn-secondary" onclick="downloadEpisode(${index})">
                        ⬇ Download
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function searchEpisodes() {
    const query = episodeSearch.value.toLowerCase().trim();
    
    if (!query) {
        filteredEpisodes = allEpisodes;
    } else {
        filteredEpisodes = allEpisodes.filter(ep => 
            ep.title.toLowerCase().includes(query) ||
            ep.description.toLowerCase().includes(query)
        );
    }
    
    renderEpisodes();
}

function playEpisode(index) {
    currentEpisode = filteredEpisodes[index];
    if (!currentEpisode || !currentEpisode.audioUrl) return;
    
    audio.src = currentEpisode.audioUrl;
    audio.playbackRate = currentSpeed;
    updateMiniPlayer();
    updateNowPlayingPage();
    audio.play();
}

function updateMiniPlayer() {
    if (!currentEpisode) return;
    
    miniPlayerTitle.textContent = currentEpisode.title;
    miniPlayerPodcast.textContent = currentPodcast?.name || '';
    
    const artworkUrl = currentPodcast?.displayArtwork || currentPodcast?.artwork_url;
    if (artworkUrl) {
        miniPlayerArtwork.innerHTML = `<img src="${artworkUrl}" alt="${currentPodcast.name}" onerror="this.parentElement.innerHTML='🎙️'">`;
    } else {
        miniPlayerArtwork.textContent = '🎙️';
    }
    
    showMiniPlayer();
}

function updateNowPlayingPage() {
    if (!currentEpisode) return;
    
    nowPlayingTitle.textContent = currentEpisode.title;
    nowPlayingPodcast.textContent = currentPodcast?.name || '';
    
    const artworkUrl = currentPodcast?.displayArtwork || currentPodcast?.artwork_url;
    if (artworkUrl) {
        nowPlayingArtwork.innerHTML = `<img src="${artworkUrl}" alt="${currentPodcast.name}">`;
    } else {
        nowPlayingArtwork.textContent = '🎙️';
    }
}

function openNowPlaying() {
    if (!currentEpisode) return;
    updateNowPlayingPage();
    
    // Toggle sidebar open
    nowPlayingPage.classList.add('active');
    document.body.classList.add('now-playing-open');
    
    // On mobile, hide mini player when sidebar is open
    if (window.innerWidth < 1024) {
        hideMiniPlayer();
    }
}

function closeNowPlaying() {
    // Close sidebar
    nowPlayingPage.classList.remove('active');
    document.body.classList.remove('now-playing-open');
    
    // Show mini player again
    if (currentEpisode && audio.src) {
        showMiniPlayer();
    }
}

function togglePlayPause() {
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}

function updateProgress() {
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        
        miniProgressFill.style.width = `${percent}%`;
        nowPlayingProgressFill.style.width = `${percent}%`;
        nowPlayingProgressHandle.style.left = `${percent}%`;
        nowPlayingCurrentTime.textContent = formatTime(audio.currentTime);
    }
}

function updateDuration() {
    if (audio.duration) {
        nowPlayingDuration.textContent = formatTime(audio.duration);
    }
}

function seek(e) {
    const rect = nowPlayingProgressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
}

function showMiniPlayer() {
    miniPlayer.classList.remove('hidden');
}

function hideMiniPlayer() {
    miniPlayer.classList.add('hidden');
}

function closeMiniPlayer() {
    audio.pause();
    audio.src = '';
    hideMiniPlayer();
    currentEpisode = null;
}

// Speed Controls
function cycleSpeed() {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
}

function setSpeed(speed) {
    currentSpeed = speed;
    audio.playbackRate = speed;
    
    // Update mini player speed button
    if (miniSpeed) {
        const speedText = miniSpeed.querySelector('.speed-text');
        if (speedText) {
            speedText.textContent = `${speed}×`;
        }
    }
    
    // Update speed buttons in Now Playing
    document.querySelectorAll('.speed-btn').forEach(btn => {
        if (parseFloat(btn.dataset.speed) === speed) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    console.log(`🎵 Playback speed set to ${speed}×`);
}

// Volume Control
function updateVolume() {
    const volume = nowPlayingVolume.value / 100;
    audio.volume = volume;
    volumePercent.textContent = `${nowPlayingVolume.value}%`;
}

// Sleep Timer
function setSleepTimer(minutes) {
    cancelSleepTimer();
    
    const milliseconds = minutes * 60 * 1000;
    sleepTimerEndTime = Date.now() + milliseconds;
    
    sleepTimer = setTimeout(() => {
        audio.pause();
        cancelSleepTimer();
        
        const status = document.getElementById('timerStatus');
        if (status) {
            status.textContent = 'Sleep timer ended';
            setTimeout(() => {
                status.classList.add('hidden');
            }, 3000);
        }
    }, milliseconds);
    
    document.querySelectorAll('.timer-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const status = document.getElementById('timerStatus');
    if (status) {
        status.textContent = `Timer set for ${minutes} minute${minutes > 1 ? 's' : ''}`;
        status.classList.remove('hidden');
    }
    
    console.log(`⏰ Sleep timer set for ${minutes} minutes`);
}

function cancelSleepTimer() {
    if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
        sleepTimerEndTime = null;
    }
    
    document.querySelectorAll('.timer-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const status = document.getElementById('timerStatus');
    if (status) {
        status.classList.add('hidden');
    }
    
    console.log('⏰ Sleep timer cancelled');
}

// Auto-Play Next Episode
function handleEpisodeEnded() {
    const autoPlayToggle = document.getElementById('autoPlayToggle');
    if (autoPlayToggle && autoPlayToggle.checked) {
        const currentIndex = filteredEpisodes.indexOf(currentEpisode);
        if (currentIndex >= 0 && currentIndex < filteredEpisodes.length - 1) {
            console.log('▶️ Auto-playing next episode');
            
            // Remember if Now Playing was open
            const nowPlayingWasOpen = nowPlayingPage.classList.contains('active');
            
            // Play next episode
            playEpisode(currentIndex + 1);
            
            // Keep Now Playing open if it was open
            if (nowPlayingWasOpen) {
                // Small delay to ensure episode is loaded
                setTimeout(() => {
                    nowPlayingPage.classList.add('active');
                    document.body.classList.add('now-playing-open');
                }, 100);
            }
            
            // Always keep mini player visible
            showMiniPlayer();
        }
    }
}

function downloadEpisode(index) {
    const episode = filteredEpisodes[index];
    if (!episode || !episode.audioUrl) return;
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = episode.audioUrl;
    a.download = sanitizeFilename(episode.title) + '.mp3';
    a.target = '_blank';
    
    document.body.appendChild(a);
    
    try {
        a.click();
        
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Downloading...';
        btn.disabled = true;
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Download failed:', error);
        window.open(episode.audioUrl, '_blank');
    } finally {
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);
    }
}

// Utility functions
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch {
        return '';
    }
}

function formatDuration(duration) {
    if (!duration) return '';
    if (duration.includes(':')) return duration;
    
    const secs = parseInt(duration);
    if (isNaN(secs)) return duration;
    
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;
    
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9 ]/gi, '_').replace(/\s+/g, '_').toLowerCase();
}
