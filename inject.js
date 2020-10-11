/// Enable handling audio & video speed
window.AudioContext = window.AudioContext || window.webkitAudioContext;

//======== HTML CONSTANTS ========

let VIDEO;    // var for video tag
let ANALYSER; // var for analyser

const ROOT_CLASS = "vsq_root";
const SETTINGS_BAR_CLASS = "vsq_settings_bar";
const BUTTON_CLASS = "vsq_button";
const INPUT_CLASS = "vsq_input";
const TXT_CLASS = "vsq_txt";

// Squeeze enabled
let IS_SQUEEZE_ENABLED = false;
const SQUEESE_ENABLED_TXT = "Squeeze is enabled";
const SQUEESE_DISABLED_TXT = "Squeeze is disabled";

// Paused
let IS_PAUSED = false;




//======== CONSTANTS: speed ========

let CURRENT_SPEED = 1;




//======== CONSTANTS: squeeze ========

let SQUEEZE_SPEED = 1;

const SLEEP_MS = 50;
const LOUDNESS_WINDOW_SIZE = 20;
const ADJ_SPEED_SILENCE_RATIO = 7;

const ADJ_SPEED_LOUDNESS_EXPECTED = 0.1;

function GetSqueezeSpeed() {
  return SQUEEZE_SPEED;
}

function GetSqueezeSpeedMax() {
  return GetSqueezeSpeed() * 3;
}



//======== INITIAL ========

/// Find video object in document
function GetVideoFromDocument() {
  return document.querySelector("video,audio");
}



/// Init settings bar over video

const settings_bar = document.createElement('div');
settings_bar.classList.add(SETTINGS_BAR_CLASS);

function RenderSettingsBar() {
  // Clean up
  const parent_element = VIDEO.parentElement;
  settings_bar.innerText = "";


  // Add speed elements
  const speed_area = document.createElement('div');
  
  const btn_inc_speed = document.createElement('button');
  btn_inc_speed.classList.add(BUTTON_CLASS);
  
  const input_speed = document.createElement('input');
  input_speed.classList.add(INPUT_CLASS);
  input_speed.disabled = true;
  
  const btn_dec_speed = document.createElement('button');
  btn_dec_speed.classList.add(BUTTON_CLASS);


  // Add squeeze elements
  const squeeze_area = document.createElement('div');
  const squeeze_speed_area = document.createElement('div');
  const squeeze_enabled_area = document.createElement('div');
 
  const squeeze_btn_inc_speed = document.createElement('button');
  squeeze_btn_inc_speed.classList.add(BUTTON_CLASS);

  const squeeze_input_speed = document.createElement('input');
  squeeze_input_speed.classList.add(INPUT_CLASS);
  squeeze_input_speed.disabled = true;

  const squeeze_btn_dec_speed = document.createElement('button');
  squeeze_btn_dec_speed.classList.add(BUTTON_CLASS);

  const checkbox_squeeze_enabled = document.createElement('input');
  checkbox_squeeze_enabled.type = 'checkbox';

  const txt_squeeze_enabled = document.createElement('p');
  txt_squeeze_enabled.classList.add(TXT_CLASS);



  // Apply inheritance
  parent_element.appendChild(settings_bar);
  settings_bar.appendChild(speed_area);
  settings_bar.appendChild(squeeze_area);


  // Apply speed inhritance
  speed_area.appendChild(btn_dec_speed);
  speed_area.appendChild(input_speed);
  speed_area.appendChild(btn_inc_speed);


  // Apply squeeze inheritance
  squeeze_area.appendChild(squeeze_enabled_area);
  squeeze_area.appendChild(squeeze_speed_area);

  squeeze_speed_area.appendChild(squeeze_btn_dec_speed);
  squeeze_speed_area.appendChild(squeeze_input_speed);
  squeeze_speed_area.appendChild(squeeze_btn_inc_speed);

  squeeze_enabled_area.appendChild(checkbox_squeeze_enabled);
  squeeze_enabled_area.appendChild(txt_squeeze_enabled);


  
  // Fill speed elements
  btn_inc_speed.innerText = "+";
  btn_dec_speed.innerText = "-";
  input_speed.value = CURRENT_SPEED.toString();


  // Fill squeeze elements
  squeeze_btn_inc_speed.innerText = "+";
  squeeze_btn_dec_speed.innerText = "-";
  squeeze_input_speed.value = SQUEEZE_SPEED.toString();

  checkbox_squeeze_enabled.checked = IS_SQUEEZE_ENABLED;
  txt_squeeze_enabled.innerText = 
    IS_SQUEEZE_ENABLED ? SQUEESE_ENABLED_TXT : SQUEESE_DISABLED_TXT;



  // Add speed event listeners
  btn_inc_speed.addEventListener('click', event => {
    event.stopPropagation();
    IS_SQUEEZE_ENABLED = false;
    IncInputSpeed(input_speed);
  });

  btn_dec_speed.addEventListener('click', event => {
    event.stopPropagation();
    IS_SQUEEZE_ENABLED = false;
    DecInputSpeed(input_speed);
  });

  // Add squeeze event listeners
  squeeze_btn_inc_speed.addEventListener('click', event => {
    event.stopPropagation();
    IS_SQUEEZE_ENABLED = true;
    IncInputSpeed(squeeze_input_speed);
  });

  squeeze_btn_dec_speed.addEventListener('click', event => {
    event.stopPropagation();
    IS_SQUEEZE_ENABLED = true;
    DecInputSpeed(squeeze_input_speed);
  });

  squeeze_enabled_area.addEventListener('click', event => {
    event.stopPropagation();
    SqueeseEnabledClick();
  });
}



//======== INITIAL: events ========

function SetInputSpeed(input, speed) {
  if (IS_SQUEEZE_ENABLED) {
    SQUEEZE_SPEED = Number(speed);
  } else {
    CURRENT_SPEED = Number(speed);
  }

  UpdateVideoSettings();
}


function IncInputSpeed(input) {
  SetInputSpeed(input, Number(input.value) + 1);
  console.log("inc: speed = " + CURRENT_SPEED);
  console.log("inc: squeeze speed = " + SQUEEZE_SPEED);
}


function DecInputSpeed(input) {
  SetInputSpeed(input, Math.max(Number(input.value) - 1, 1));
  console.log("dec: speed = " + CURRENT_SPEED);
  console.log("dec: squeeze speed = " + SQUEEZE_SPEED);
}


function SqueeseEnabledClick() {
  ChangeSqueezeEnabled();
  UpdateVideoSettings();
  console.log("checkbox clicked");
}




//======== UPDATE ========

function UpdateVideoSettings() {
  RenderSettingsBar();

  if (!IS_SQUEEZE_ENABLED) {
    SetSpeed(CURRENT_SPEED);
  } else {
    SpeedUp();
  }
}


function ChangeSqueezeEnabled() {
  IS_SQUEEZE_ENABLED = !IS_SQUEEZE_ENABLED;
}


/// Apply speed and sound on video
async function SpeedUp(speedMode) {
  const loudness_window = Array(LOUDNESS_WINDOW_SIZE);
  const loudness_sample_idx = 0;

  let loudness_array = new Uint8Array(ANALYSER.fftSize);
  ANALYSER.getByteTimeDomainData(loudness_array);
  
  let adj_speed = IndicatorSimpleDerivativeAdjSpeed(loudness_array);
  SetSpeed(adj_speed);

  setTimeout(function () { 
    if (IS_SQUEEZE_ENABLED && !IS_PAUSED) SpeedUp();
  }, SLEEP_MS);
}


function IsSqueezeEnabled() {
  return IS_SQUEEZE_ENABLED;
}


function SetSpeed(speed) {
  VIDEO.playbackRate = Number(speed.toFixed(2));
}




//======= UPDATE: adjust speed modes ========

function GetLoudnessWindow(loudness_array, window_size) {
  loudness_window = loudness_array.slice(0, window_size);
  for (let i = 0; i < window_size; ++i) {
    loudness_window[i] = Math.abs(loudness_window[i] - ANALYSER.fftSize / 2);
  }

  return loudness_window;
}


function GetLoudnessMax(loudness_array) {
  return loudness_array.reduce((acc, x) => Math.max(acc, x), 0);
}


function GetLoudnessAvg(loudness_array) {
  return loudness_array.reduce((acc, x) => acc + x, 0) / loudness_array.length;
}


function IndicatorAdjSpeed(loudness_array) {
  const loudness_avg = GetLoudnessAvg(GetLoudnessWindow(
    loudness_array, LOUDNESS_WINDOW_SIZE));
  const adj_speed = loudness_avg > 3 ? SQUEEZE_SPEED : GetSqueezeSpeedMax();

  console.log(loudness_avg, adj_speed);
  return adj_speed;
}


function LinearAdjSpeed(loudness_array) {
  // FIXME: fix it all

  loudness_window = GetLoudnessWindow(loudness_array, LOUDNESS_WINDOW_SIZE);
  const loudness_max = loudness_array.reduce(
    (acc, x) => Math.max(acc, Math.abs(x - ANALYSER.fftSize / 2)), 0);
  const loudness = loudness_window.reduce((acc, x) => Math.max(acc, x), 0);
  const alpha = loudness / loudness_max;
  const adj_speed = Math.min(GetSqueezeSpeedMax(), SQUEEZE_SPEED * (1 + alpha));
 
  console.log(loudness_max, loudness, alpha, adj_speed);
  return adj_speed;

//  return (ADJ_SPEED_MAX - SQUEEZE_SPEED) * ADJ_SPEED_SILENCE_RATIO *
//    Math.max(ADJ_SPEED_LOUDNESS_EXPECTED - loudness, 0);
}


function SimpleDerivativeAdjSpeed(loudness_array) {
  loudness_avg_first = GetLoudnessAvg(GetLoudnessWindow(
    loudness_array, LOUDNESS_WINDOW_SIZE / 2));
  loudness_avg_last = 0.1 + GetLoudnessAvg(GetLoudnessWindow(
    loudness_array.slice(LOUDNESS_WINDOW_SIZE / 2), LOUDNESS_WINDOW_SIZE / 2));

  const alpha = loudness_avg_first / loudness_avg_last;
  const adj_speed = alpha > 1 ? GetSqueezeSpeedMax() : GetSqueezeSpeed() ;
  console.log(loudness_array, alpha, adj_speed);

  return adj_speed;  
}

function IndicatorSimpleDerivativeAdjSpeed(loudness_array) {
  const indicator = IndicatorAdjSpeed(loudness_array);
  const simple_der = SimpleDerivativeAdjSpeed(loudness_array);

  const adj_speed = Math.sqrt(indicator * simple_der);
  console.log(adj_speed);

  return adj_speed;
}




//======== MAIN ========

async function main() {
  VIDEO = GetVideoFromDocument();
  console.log(VIDEO);
  RenderSettingsBar();

  // Init audio context
  window.context = new AudioContext();
  media_element = context.createMediaElementSource(VIDEO);
  ANALYSER = context.createAnalyser();
  ANALYSER.smoothingTimeConstant = 0.9;
  ANALYSER.fftSize = 256;
  media_element.connect(ANALYSER);
  ANALYSER.connect(context.destination);


  /// Play handler
  const play_handler = async function(event) {
    IS_PAUSED = false;
    UpdateVideoSettings();
  }

  VIDEO.addEventListener("play", 
    (this.handlePlay = play_handler.bind(this)));

  
  /// Pause handler
  const pause_handler = async function(event) {
    IS_PAUSED = true;
  }

  VIDEO.addEventListener("pause", 
    (this.handlePause = pause_handler.bind(this)));
}


main();
