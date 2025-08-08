// Lecteur MP3 GitHub Pages — lit les MP3 stockés dans le dossier `playlists/` d'un repo public
// Indique owner + repo + branch, clique "Charger playlists depuis GitHub"

const loadBtn = document.getElementById('loadBtn');
const ownerInput = document.getElementById('owner');
const repoInput = document.getElementById('repo');
const branchInput = document.getElementById('branch');
const playlistsEl = document.getElementById('playlists');
const audio = document.getElementById('audio');
const nowTitle = document.getElementById('nowTitle');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const globalShuffleToggle = document.getElementById('globalShuffle');
const continuousToggle = document.getElementById('continuous');
const subtitle = document.getElementById('subtitle');

let playlists = []; // {name, tracks:[{name, url}]}
let current = {playlistIndex:0, trackIndex:0};
let globalShuffle=false;
let continuous=true;

function apiUrl(owner, repo, path='') {
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if(!res.ok) throw new Error('GitHub API error: ' + res.status);
  return res.json();
}

async function loadPlaylistsFromRepo(owner, repo, branch='main') {
  subtitle.textContent = 'Lecture du dépôt...';
  playlists = [];
  playlistsEl.innerHTML = '';
  try {
    const list = await fetchJson(apiUrl(owner, repo, 'playlists'));
    const dirs = list.filter(e => e.type === 'dir');
    if(dirs.length === 0) {
      const files = list.filter(e => e.type === 'file' && e.name.match(/\\.mp3$|\\.m4a$|\\.ogg$|\\.wav$/i));
      if(files.length) {
        playlists.push({name:'default', tracks: files.map(f=>({name:f.name, url: rawUrl(owner,repo,branch,'playlists/'+f.name)}))});
      }
    } else {
      for(const d of dirs) {
        const files = await fetchJson(apiUrl(owner, repo, 'playlists/' + d.name));
        const tracks = files.filter(f => f.type === 'file' && f.name.match(/\\.mp3$|\\.m4a$|\\.ogg$|\\.wav$/i))
                            .map(f => ({name:f.name, url: rawUrl(owner,repo,branch,`playlists/${d.name}/${f.name}`)}));
        if(tracks.length) playlists.push({name:d.name, tracks});
      }
    }
    if(playlists.length===0) subtitle.textContent = 'Aucune piste trouvée — vérifie la structure du repo.';
    else subtitle.textContent = `Chargé ${playlists.length} playlists`;
    renderPlaylists();
    if(playlists.length) { current.playlistIndex=0; current.trackIndex=0; loadCurrentTrack(); }
  } catch(err) {
    console.error(err);
    subtitle.textContent = 'Erreur: ' + err.message;
  }
}

function rawUrl(owner, repo, branch, path) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function renderPlaylists(){
  playlistsEl.innerHTML='';
  playlists.forEach((pl, pi) => {
    const div = document.createElement('div'); div.className='playlist';
    const h = document.createElement('h3'); h.innerHTML = `<span>${pl.name} (${pl.tracks.length})</span>`;
    const controls = document.createElement('span');
    const shuffleBtn = document.createElement('button'); shuffleBtn.textContent='Shuffle'; shuffleBtn.className='smallbtn';
    shuffleBtn.onclick = ()=> shufflePlaylist(pi);
    controls.appendChild(shuffleBtn);
    h.appendChild(controls);
    div.appendChild(h);

    const tdiv = document.createElement('div'); tdiv.className='track-list';
    pl.tracks.forEach((t, ti) => {
      const tr = document.createElement('div'); tr.className='track'; tr.textContent = t.name;
      tr.onclick = ()=> playTrack(pi, ti);
      if(pi === current.playlistIndex && ti === current.trackIndex) tr.classList.add('active');
      tdiv.appendChild(tr);
    });
    div.appendChild(tdiv);
    playlistsEl.appendChild(div);
  });
}

function shufflePlaylist(pi){
  const pl = playlists[pi];
  for(let i = pl.tracks.length -1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [pl.tracks[i], pl.tracks[j]] = [pl.tracks[j], pl.tracks[i]];
  }
  renderPlaylists();
}

function loadCurrentTrack(){
  if(!playlists.length) return;
  const pl = playlists[current.playlistIndex];
  if(!pl) return;
  const track = pl.tracks[current.trackIndex];
  if(!track) return;
  audio.src = track.url;
  nowTitle.textContent = `${pl.name} — ${track.name}`;
  highlightActive();
}

function highlightActive(){
  const trackEls = document.querySelectorAll('.playlist');
  trackEls.forEach((plEl, pi) => {
    const children = plEl.querySelectorAll('.track');
    children.forEach((c, ti) => {
      c.classList.toggle('active', pi===current.playlistIndex && ti===current.trackIndex);
    });
  });
}

function playTrack(pi, ti){
  current.playlistIndex = pi; current.trackIndex = ti;
  loadCurrentTrack();
  audio.play();
}

function nextTrack(){
  if(globalShuffle){
    if(!playlists.length) return;
    const pi = Math.floor(Math.random()*playlists.length);
    const pl = playlists[pi];
    const ti = Math.floor(Math.random()*pl.tracks.length);
    current.playlistIndex = pi; current.trackIndex = ti;
    loadCurrentTrack(); audio.play(); return;
  }
  const pl = playlists[current.playlistIndex];
  if(!pl) return;
  if(current.trackIndex < pl.tracks.length - 1){
    current.trackIndex++;
  } else {
    if(current.playlistIndex < playlists.length -1){
      current.playlistIndex++; current.trackIndex = 0;
    } else {
      current.playlistIndex = 0; current.trackIndex = 0;
    }
  }
  loadCurrentTrack();
  if(continuous) audio.play();
}

function prevTrack(){
  if(audio.currentTime > 3){ audio.currentTime = 0; return; }
  if(current.trackIndex > 0) { current.trackIndex--; }
  else {
    if(current.playlistIndex > 0){ current.playlistIndex--; current.trackIndex = playlists[current.playlistIndex].tracks.length -1; }
    else { current.playlistIndex = 0; current.trackIndex = 0; }
  }
  loadCurrentTrack();
  audio.play();
}

playBtn.onclick = ()=> { if(audio.paused) audio.play(); else audio.pause(); };
audio.addEventListener('play',()=>{ playBtn.textContent='⏸️'; });
audio.addEventListener('pause',()=>{ playBtn.textContent='▶️'; });
prevBtn.onclick = prevTrack;
nextBtn.onclick = nextTrack;
globalShuffleToggle.addEventListener('change', (e)=>{ globalShuffle = e.target.checked; });
continuousToggle.addEventListener('change', (e)=>{ continuous = e.target.checked; });

loadBtn.onclick = ()=> {
  const owner = ownerInput.value.trim() || ownerInput.placeholder;
  const repo = repoInput.value.trim() || repoInput.placeholder;
  const branch = branchInput.value.trim() || branchInput.placeholder;
  loadPlaylistsFromRepo(owner, repo, branch);
};

ownerInput.value = ownerInput.placeholder;
repoInput.value = repoInput.placeholder;
branchInput.value = branchInput.placeholder;
subtitle.textContent = 'Indique owner/repo/branch puis clique "Charger playlists depuis GitHub".';

