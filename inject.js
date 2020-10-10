/// Enable handling audio & video speed
window.AudioContext = window.AudioContext || window.webkitAudioContext;

//======== HTML CONSTANTS ========

SETTINGS_BAR_CLASS = "vsq_settings_bar";
BUTTON_CLASS = "vsq_button";
DUMMY_TEXT_CLASS = "vsq_dummy_text";




//======== SPEED CONSTANTS ========

// Updation flag
let IS_STATE_CHANGED = true;

// Squeeze enabled
let IS_SQUEEZE_ENABLED = false;
const SQUEESE_ENABLED_TXT = "Squeeze is enabled";
const SQUEESE_DISABLED_TXT = "Squeeze is disabled";

// Paused
let IS_PAUSED = false;

const SLEEP_MS = 50;
const LOUDNESS_WINDOW_SIZE = 20;
const ADJ_SPEED_SILENCE_RATIO = 7;
const BASE_SPEED = 2;
const ADJ_SPEED_MAX = BASE_SPEED * 3;
const ADJ_SPEED_LOUDNESS_EXPECTED = 0.1;




//======== INITIAL ========

/// Find video object in document
function GetVideoFromDocument() {
  video = document.querySelector("video,audio,video-stream");
  if (video == null) {
    return document.querySele
  }
}


/// Init settings bar over video
function RenderSettingsBar(video) {
/*  const parent_element = video.parentElement;

  const settings_bar = document.createElement('div');
  settings_bar.classList.add(SETTINGS_BAR_CLASS);
//  const dummy_text = document.createElement('p');
//  dummy_text.classList.add(DUMMY_TEXT_CLASS);
  const button = document.createElement('button');
  button.classList.add(BUTTON_CLASS);

  parent_element.appendChild(settings_bar);
//  settings_bar.appendChild(dummy_text);
  settings_bar.appendChild(button);

//  dummy_text.innerText = "Dummy text";
  button.innerText = SQUEESE_DISABLED_TXT;

  button.addEventListener('click', event => {
    event.stopPropagation();
    ButtonClick(video);
  });*/
}


function ButtonClick(video) {
  IS_SQUEEZE_ENABLED = !IS_SQUEEZE_ENABLED;
//  RenderSettingsBar(video);

//  if (IS_SQUEEZE_ENABLED) {
//    this.innerText = SQUEESE_ENABLED_TXT;
//  } else {
//    this.innerText = SQUEESE_DISABLED_TXT;
//  }

//  console.log("enabled: " + IS_SQUEEZE_ENABLED);
}




//======== UPDATE ========

function UpdateSqueeseEnabled() {
  IS_SQUEEZE_ENABLED = !IS_SQUEEZE_ENABLED;
}


/// Apply speed and sound on video
async function SpeedUp(video, analyser, speedMode) {
  const loudness_window = Array(LOUDNESS_WINDOW_SIZE);
  const loudness_sample_idx = 0;

  let array = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(array);
  
  let max = array.reduce(
    (acc, x) => Math.max(acc, Math.abs(x - 128)),
    0
  );

  loudness_window[loudness_sample_idx % LOUDNESS_WINDOW_SIZE] = max;

  let loudness = AverageLoudness(loudness_window);
  let adj_speed = LinearAdjSpeed(loudness);
  
  console.log(max, loudness, adj_speed);
  SetSpeed(video, adj_speed);

  setTimeout(function () { 
    if (IS_SQUEEZE_ENABLED && !IS_PAUSED) SpeedUp(video, analyser);
  }, SLEEP_MS);
}


function IsSqueezeEnabled() {
  return IS_SQUEEZE_ENABLED;
}


function SetSpeed(video, speed) {
  video.playbackRate = Number(speed.toFixed(2));
}




//======== LOUDNESS WINDOW MODES ========

function AverageLoudness(loudness_window) {
  return loudness_window.reduce((acc, x) => acc + x, 0) / LOUDNESS_WINDOW_SIZE;
}




//======= ADJUST SPEED MODES ========

function LinearAdjSpeed(loudness) {
  return BASE_SPEED + (ADJ_SPEED_MAX - 1) * ADJ_SPEED_SILENCE_RATIO *
    Math.max(ADJ_SPEED_LOUDNESS_EXPECTED - loudness, 0);
}




///======== MAIN ========

async function main() {
  const video = GetVideoFromDocument();
  console.log(video);
  //RenderSettingsBar(video);

  // Init audio context
  window.context = new AudioContext();
  media_element = context.createMediaElementSource(video);
  analyser = context.createAnalyser();
  analyser.smoothingTimeConstant = 0.9;
  analyser.fftSize = 256;
  media_element.connect(analyser);
  analyser.connect(context.destination);


  /// Play handler
  const play_handler = async function(event) {
    IS_PAUSED = false;
    UpdateSqueeseEnabled();
    if (!IS_SQUEEZE_ENABLED) {
      SetSpeed(video, BASE_SPEED);
      return;
    }

    SpeedUp(video, analyser);
  }

  video.addEventListener("play", (this.handlePlay = play_handler.bind(this)));

  
  /// Pause handler
  const pause_handler = async function(event) {
    IS_PAUSED = true;
    SetSpeed(video, BASE_SPEED);
  }

  video.addEventListener("pause", 
    (this.handlePause = pause_handler.bind(this)));
}


main();
