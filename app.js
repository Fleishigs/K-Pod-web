// State
let podcasts = [];
let currentPodcast = null;
let allEpisodes = [];
let filteredEpisodes = [];
let currentEpisode = null;
let currentPage = 'home';

// DOM Elements
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

// Settings state
let currentSpeed = 1;
let sleepTimer = null;
let sleepTimerEndTime = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    await loadPodcasts();
}

function setupEventListeners() {
    // Navigation
    navBackBtn.addEventListener('click', handleBackButton);
    navLogo.addEventListener('click', () => {
        goHome();
        updateNavigation();
    });
    
    // Mini player controls
    miniPlayPause.addEventListener('click', togglePlayPause);
    miniRewind.addEventListener('click', () => audio.currentTime = Math.max(0, audio.currentTime - 15));
    miniForward.addEventListener('click', () => audio.currentTime = Math.min(audio.duration, audio.currentTime + 30));
    miniPlayerClose.addEventListener('click', closeMiniPlayer);
    
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
    audio.addEventListener('play', () => {
        miniPlayIcon.classList.add('hidden');
        miniPauseIcon.classList.remove('hidden');
    });
    audio.addEventListener('pause', () => {
        miniPlayIcon.classList.remove('hidden');
        miniPauseIcon.classList.add('hidden');
    });
}

// Navigation
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    page.classList.add('active');
    
    if (page === homePage) currentPage = 'home';
    else if (page === podcastPage) currentPage = 'podcast';
    
    updateNavigation();
}

function updateNavigation() {
    if (currentPage === 'home') {
        navBackBtn.classList.add('hidden');
    } else {
        navBackBtn.classList.remove('hidden');
    }
}

function handleBackButton() {
    if (currentPage === 'podcast') {
        goHome();
    }
}

function goHome() {
    showPage(homePage);
    currentPodcast = null;
    allEpisodes = [];
    filteredEpisodes = [];
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
            
            // Render immediately with placeholder images
            renderPodcasts();
            
            // Then fetch RSS artwork for each podcast in the background
            console.log('🎨 Fetching RSS artwork for all podcasts...');
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

// Fetch artwork from RSS feeds for all podcasts
async function fetchAllPodcastArtwork() {
    for (let i = 0; i < podcasts.length; i++) {
        const podcast = podcasts[i];
        
        try {
            console.log(`  🔍 [${i+1}/${podcasts.length}] Fetching RSS artwork for: ${podcast.name}`);
            const xmlText = await fetchRSSFeed(podcast.rss_url);
            const { channelInfo } = parseRSSFeed(xmlText);
            
            if (channelInfo.artwork) {
                console.log(`  ✅ Found artwork for ${podcast.name}`);
                podcast.rssArtwork = channelInfo.artwork;
                
                // Update the card image immediately
                const card = document.querySelector(`[data-podcast-id="${podcast.id}"] .podcast-artwork`);
                if (card) {
                    card.classList.remove('loading-artwork');
                    card.innerHTML = `<img src="${channelInfo.artwork}" alt="${escapeHtml(podcast.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<span style=\\'font-size: 3rem;\\'>🎙️</span>';">`;
                }
            } else {
                console.log(`  ⚠️ No artwork in RSS for ${podcast.name}, keeping emoji`);
                const card = document.querySelector(`[data-podcast-id="${podcast.id}"] .podcast-artwork`);
                if (card) {
                    card.classList.remove('loading-artwork');
                }
            }
        } catch (error) {
            console.warn(`  ❌ Failed to fetch RSS for ${podcast.name}:`, error.message);
            const card = document.querySelector(`[data-podcast-id="${podcast.id}"] .podcast-artwork`);
            if (card) {
                card.classList.remove('loading-artwork');
            }
        }
        
        // Small delay to avoid overwhelming the proxies
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log('✅ Finished fetching all RSS artwork');
}

async function fetchWithFallback(url) {
    console.log('🔍 Fetching:', url);
    
    const methods = [
        {
            name: 'Direct',
            fn: () => fetch(url).then(r => r.text())
        },
        {
            name: 'AllOrigins',
            fn: () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`).then(r => r.text())
        },
        {
            name: 'CorsProxy',
            fn: () => fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`).then(r => r.text())
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

// Render Podcasts
function renderPodcasts() {
    loading.classList.add('hidden');
    podcastsContainer.classList.remove('hidden');
    
    console.log('🎨 Rendering podcasts with RSS artwork loading...');
    
    podcastsContainer.innerHTML = podcasts.map(podcast => {
        // Start with emoji and loading class, RSS artwork will load in background
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
    updateMiniPlayer();
    audio.play();
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
    }
}

function showMiniPlayer() {
    miniPlayer.classList.remove('hidden');
}

function hideMiniPlayer() {
    miniPlayer.classList.add('hidden');
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

function closeMiniPlayer() {
    audio.pause();
    audio.src = '';
    hideMiniPlayer();
    currentEpisode = null;
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

function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9 ]/gi, '_').replace(/\s+/g, '_').toLowerCase();
}
