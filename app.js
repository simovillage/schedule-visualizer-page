const availabilityForm = document.getElementById("availability-form");
const eventForm = document.getElementById("event-form");
const dayStartInput = document.getElementById("day-start");
const dayEndInput = document.getElementById("day-end");
const eventTitleInput = document.getElementById("event-title");
const eventModeDurationInput = document.getElementById("event-mode-duration");
const eventModeRangeInput = document.getElementById("event-mode-range");
const eventDurationInput = document.getElementById("event-duration");
const eventStartInput = document.getElementById("event-start");
const eventEndInput = document.getElementById("event-end");
const eventColorInput = document.getElementById("event-color");
const durationFields = document.getElementById("duration-fields");
const rangeFields = document.getElementById("range-fields");
const timeline = document.getElementById("timeline");
const timelineHours = document.getElementById("timeline-hours");
const eventList = document.getElementById("event-list");
const feedback = document.getElementById("feedback");
const totalDuration = document.getElementById("total-duration");
const plannedDuration = document.getElementById("planned-duration");
const freeDuration = document.getElementById("free-duration");
const pendingBlockList = document.getElementById("pending-block-list");
const resetTimelineButton = document.getElementById("reset-timeline");
const saveTimelineImageButton = document.getElementById("save-timeline-image");
const clearPendingBlocksButton = document.getElementById("clear-pending-blocks");
const clearEventsButton = document.getElementById("clear-events");

const state = {
  dayStart: "17:45",
  dayEnd: "23:00",
  events: [],
  pendingBlocks: [
    { id: crypto.randomUUID(), title: "風呂", duration: 60, color: "#a8c686" },
    { id: crypto.randomUUID(), title: "調理", duration: 30, color: "#a8c686" },
    { id: crypto.randomUUID(), title: "食事", duration: 30, color: "#a8c686" },
    { id: crypto.randomUUID(), title: "皿洗い", duration: 30, color: "#a8c686" },
    { id: crypto.randomUUID(), title: "明日の準備", duration: 15, color: "#a8c686" }
  ]
};

const DEFAULT_DURATION_MINUTES = 30;
const DEFAULT_RANGE_OFFSET_MINUTES = 0;
const MINUTE_HEIGHT = 2.4;
const DROP_STEP_MINUTES = 15;

let dropPreview = null;

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours && mins) {
    return `${hours}h ${mins}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${mins}m`;
}

function formatRange(start, end) {
  return `${start} - ${end}`;
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? "var(--danger)" : "var(--highlight)";
}

function hexToRgb(hex) {
  const sanitized = hex.replace("#", "");
  const value = sanitized.length === 3
    ? sanitized.split("").map((char) => char + char).join("")
    : sanitized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function tintColor(hex, ratio) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (channel) => Math.round(channel + (255 - channel) * ratio);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function rgbaFromHex(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getEventDuration(event) {
  return timeToMinutes(event.end) - timeToMinutes(event.start);
}

function sortEvents() {
  state.events.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

function getDayDuration() {
  return timeToMinutes(state.dayEnd) - timeToMinutes(state.dayStart);
}

function getDefaultRangeValues() {
  const dayStartMinutes = timeToMinutes(state.dayStart);
  const dayEndMinutes = timeToMinutes(state.dayEnd);
  const defaultStartMinutes = Math.min(dayStartMinutes + DEFAULT_RANGE_OFFSET_MINUTES, dayEndMinutes);
  const defaultEndMinutes = Math.min(defaultStartMinutes + DEFAULT_DURATION_MINUTES, dayEndMinutes);

  return {
    start: minutesToTime(defaultStartMinutes),
    end: minutesToTime(defaultEndMinutes)
  };
}

function getTimelineDisplayStart() {
  return timeToMinutes(state.dayStart);
}

function getTimelineDisplayEnd() {
  return timeToMinutes(state.dayEnd);
}

function getTimelineDisplayDuration() {
  return getTimelineDisplayEnd() - getTimelineDisplayStart();
}

function syncTimelineGridOffsets() {
  const displayStart = getTimelineDisplayStart();
  const minutesToNextHour = (60 - (displayStart % 60)) % 60;
  const minutesToNextHalfHour = (30 - (displayStart % 30)) % 30;
  const hourOffset = minutesToNextHour * MINUTE_HEIGHT;
  const halfHourOffset = minutesToNextHalfHour * MINUTE_HEIGHT;

  timeline.style.setProperty("--hour-line-offset", `${hourOffset}px`);
  timeline.style.setProperty("--half-hour-line-offset", `${halfHourOffset}px`);
  timeline.style.setProperty("--half-line-step", `${30 * MINUTE_HEIGHT}px`);
  timeline.style.setProperty("--hour-line-step", `${60 * MINUTE_HEIGHT}px`);
}

function validateAvailability(start, end) {
  return timeToMinutes(end) > timeToMinutes(start);
}

function isEventInRange(start, end) {
  const blockStart = timeToMinutes(start);
  const blockEnd = timeToMinutes(end);
  const dayStart = timeToMinutes(state.dayStart);
  const dayEnd = timeToMinutes(state.dayEnd);
  return blockStart >= dayStart && blockEnd <= dayEnd;
}

function hasOverlap(candidateStart, candidateEnd, ignoredId = null) {
  const start = timeToMinutes(candidateStart);
  const end = timeToMinutes(candidateEnd);

  return state.events.some((event) => {
    if (event.id === ignoredId) {
      return false;
    }

    const eventStart = timeToMinutes(event.start);
    const eventEnd = timeToMinutes(event.end);
    return start < eventEnd && end > eventStart;
  });
}

function findPendingBlock(blockId) {
  return state.pendingBlocks.find((block) => block.id === blockId);
}

function findEvent(eventId) {
  return state.events.find((event) => event.id === eventId);
}

function removePendingBlock(blockId) {
  state.pendingBlocks = state.pendingBlocks.filter((block) => block.id !== blockId);
}

function syncTimelineColumnHeight() {
  timelineHours.style.height = `${timeline.offsetHeight}px`;
}

function clearDropPreview() {
  if (dropPreview) {
    dropPreview.remove();
    dropPreview = null;
  }
}

function getEventInputMode() {
  return eventModeRangeInput.checked ? "range" : "duration";
}

function syncEventModeFields() {
  const isRangeMode = getEventInputMode() === "range";
  durationFields.hidden = isRangeMode;
  rangeFields.hidden = !isRangeMode;
  durationFields.style.display = isRangeMode ? "none" : "";
  rangeFields.style.display = isRangeMode ? "grid" : "none";
  eventDurationInput.required = !isRangeMode;
  eventStartInput.required = isRangeMode;
  eventEndInput.required = isRangeMode;
}

function renderHourLabels() {
  timelineHours.innerHTML = "";

  const displayStart = getTimelineDisplayStart();
  const displayDuration = getTimelineDisplayDuration();
  const start = timeToMinutes(state.dayStart);
  const end = timeToMinutes(state.dayEnd);
  const labelMinutes = [start];

  let nextHour = Math.ceil(start / 60) * 60;
  if (nextHour === start) {
    nextHour += 60;
  }

  for (let minutes = nextHour; minutes < end; minutes += 60) {
    labelMinutes.push(minutes);
  }

  if (end !== start) {
    labelMinutes.push(end);
  }

  labelMinutes.forEach((minutes) => {
    const label = document.createElement("div");
    label.className = "hour-label";
    label.textContent = minutesToTime(minutes);
    label.style.top = `${((minutes - displayStart) / displayDuration) * 100}%`;
    timelineHours.appendChild(label);
  });
}

function renderTimeline() {
  timeline.innerHTML = "";

  const displayStartMinutes = getTimelineDisplayStart();
  const duration = getTimelineDisplayDuration();
  timeline.style.height = `${duration * MINUTE_HEIGHT}px`;

  if (state.events.length === 0) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "まだ予定がありません。未配置ブロックをドラッグして配置してください。";
    timeline.appendChild(empty);
  }

  state.events.forEach((event) => {
    const blockStart = timeToMinutes(event.start);
    const blockEnd = timeToMinutes(event.end);
    const blockDuration = blockEnd - blockStart;
    const top = (blockStart - displayStartMinutes) * MINUTE_HEIGHT;
    const height = Math.max(blockDuration * MINUTE_HEIGHT, 36);

    const block = document.createElement("article");
    block.className = "event-block";

    if (blockDuration <= 15) {
      block.classList.add("event-block-compact");
    }

    block.draggable = true;
    block.dataset.eventId = event.id;
    block.style.top = `${top}px`;
    block.style.height = `${height}px`;
    block.style.background = tintColor(event.color, 0.45);
    block.innerHTML = `
      <button class="event-block-delete" data-event-delete="${event.id}" type="button" aria-label="予定を未配置ブロックに戻す">×</button>
      <span class="event-time">${formatRange(event.start, event.end)}</span>
      <div class="event-heading">
        <strong class="event-title">${event.title}</strong>
        <span class="event-duration">${formatDuration(blockDuration)}</span>
      </div>
    `;
    timeline.appendChild(block);
  });

  syncTimelineColumnHeight();
}

function renderEventList() {
  eventList.innerHTML = "";

  if (state.events.length === 0) {
    const item = document.createElement("li");
    item.textContent = "予定はまだありません。";
    eventList.appendChild(item);
    return;
  }

  state.events.forEach((event) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div class="event-meta">
        <span class="event-swatch" style="background:${event.color}"></span>
        <div class="event-info">
          <strong>${event.title}</strong>
          <span>${formatRange(event.start, event.end)} / ${formatDuration(getEventDuration(event))}</span>
        </div>
      </div>
      <button class="delete-button" data-event-id="${event.id}" type="button">削除</button>
    `;
    eventList.appendChild(item);
  });
}

function renderPendingBlocks() {
  pendingBlockList.innerHTML = "";

  if (state.pendingBlocks.length === 0) {
    const item = document.createElement("li");
    item.className = "pending-empty";
    item.textContent = "未配置ブロックはありません。フォームから追加してください。";
    pendingBlockList.appendChild(item);
    return;
  }

  state.pendingBlocks.forEach((block) => {
    const item = document.createElement("li");
    item.className = "pending-item";
    item.draggable = true;
    item.dataset.blockId = block.id;
    item.style.setProperty("--block-color", block.color);
    item.style.minHeight = `${Math.max(block.duration * MINUTE_HEIGHT, 56)}px`;
    item.innerHTML = `
      <button class="pending-item-delete" data-pending-delete="${block.id}" type="button" aria-label="未配置ブロックを削除">×</button>
      <strong>${block.title}</strong>
      <span>${formatDuration(block.duration)}</span>
    `;
    pendingBlockList.appendChild(item);
  });
}

function renderSummary() {
  const total = getDayDuration();
  const planned = state.events.reduce((sum, event) => sum + getEventDuration(event), 0);
  const free = Math.max(total - planned, 0);

  totalDuration.textContent = formatDuration(total);
  plannedDuration.textContent = formatDuration(planned);
  freeDuration.textContent = formatDuration(free);
}

function syncAvailabilityInputs() {
  dayStartInput.value = state.dayStart;
  dayEndInput.value = state.dayEnd;
}

function syncDefaultRangeInputs() {
  const defaults = getDefaultRangeValues();
  eventStartInput.value = defaults.start;
  eventEndInput.value = defaults.end;
}

function render() {
  sortEvents();
  syncAvailabilityInputs();
  syncEventModeFields();
  syncTimelineGridOffsets();
  renderTimeline();
  renderHourLabels();
  renderPendingBlocks();
  renderEventList();
  renderSummary();
}

function createPendingBlock(title, duration, color) {
  state.pendingBlocks.push({
    id: crypto.randomUUID(),
    title,
    duration,
    color
  });
}

function resetTimeline() {
  if (state.events.length === 0) {
    setFeedback("戻す予定はありません。", true);
    return;
  }

  state.events.forEach((event) => {
    createPendingBlock(event.title, getEventDuration(event), event.color);
  });
  state.events = [];
  render();
  setFeedback("タイムライン上の予定を未配置ブロックに戻しました。");
}

function clearPendingBlocks() {
  if (state.pendingBlocks.length === 0) {
    setFeedback("削除する未配置ブロックはありません。", true);
    return;
  }

  state.pendingBlocks = [];
  render();
  setFeedback("未配置ブロックをすべて削除しました。");
}

function clearEvents() {
  if (state.events.length === 0) {
    setFeedback("削除する予定はありません。", true);
    return;
  }

  state.events = [];
  render();
  setFeedback("予定一覧をすべて削除しました。");
}

function getDropStartMinutes(clientY) {
  const rect = timeline.getBoundingClientRect();
  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const minutesFromTop = Math.round((y / MINUTE_HEIGHT) / DROP_STEP_MINUTES) * DROP_STEP_MINUTES;
  return getTimelineDisplayStart() + minutesFromTop;
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function saveTimelineImage() {
  const labelWidth = timelineHours.offsetWidth || 56;
  const gap = 6;
  const timelineWidth = timeline.clientWidth || 720;
  const timelineHeight = timeline.clientHeight || getTimelineDisplayDuration() * MINUTE_HEIGHT;
  const padding = 20;
  const width = padding * 2 + labelWidth + gap + timelineWidth;
  const height = padding * 2 + timelineHeight;
  const canvas = document.createElement("canvas");
  const scale = window.devicePixelRatio > 1 ? 2 : 1;
  const displayStart = getTimelineDisplayStart();
  const displayEnd = getTimelineDisplayEnd();

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext("2d");
  context.scale(scale, scale);

  context.fillStyle = "#fffdf9";
  context.fillRect(0, 0, width, height);

  const timelineX = padding + labelWidth + gap;
  const timelineY = padding;

  context.strokeStyle = "rgba(92, 65, 36, 0.16)";
  context.lineWidth = 1;
  context.strokeRect(timelineX, timelineY, timelineWidth, timelineHeight);

  const minutesToNextHour = (60 - (displayStart % 60)) % 60;
  const hourLineOffset = minutesToNextHour * MINUTE_HEIGHT;

  for (let y = 0; y <= timelineHeight; y += 36) {
    context.beginPath();
    context.strokeStyle = "rgba(101, 101, 101, 0.1)";
    context.lineWidth = 1;
    context.moveTo(timelineX, timelineY + y);
    context.lineTo(timelineX + timelineWidth, timelineY + y);
    context.stroke();
  }

  for (let y = 0; y <= timelineHeight; y += 72) {
    context.beginPath();
    context.strokeStyle = "rgba(92, 92, 92, 0.28)";
    context.lineWidth = 2;
    context.moveTo(timelineX, timelineY + y);
    context.lineTo(timelineX + timelineWidth, timelineY + y);
    context.stroke();
  }

  for (let y = hourLineOffset; y <= timelineHeight; y += 144) {
    context.beginPath();
    context.strokeStyle = "rgba(74, 74, 74, 0.5)";
    context.lineWidth = 2;
    context.moveTo(timelineX, timelineY + y);
    context.lineTo(timelineX + timelineWidth, timelineY + y);
    context.stroke();
  }

  context.fillStyle = "#766554";
  context.font = "700 13px 'Space Grotesk', sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";

  const labelMinutes = [displayStart];
  let nextHour = Math.ceil(displayStart / 60) * 60;
  if (nextHour === displayStart) {
    nextHour += 60;
  }

  for (let minutes = nextHour; minutes < displayEnd; minutes += 60) {
    labelMinutes.push(minutes);
  }

  if (displayEnd !== displayStart) {
    labelMinutes.push(displayEnd);
  }

  labelMinutes.forEach((minutes) => {
    const top = ((minutes - displayStart) / getTimelineDisplayDuration()) * timelineHeight;
    context.fillText(minutesToTime(minutes), timelineX - 6, timelineY + top);
  });

  state.events.forEach((event) => {
    const blockStart = timeToMinutes(event.start);
    const blockEnd = timeToMinutes(event.end);
    const blockDuration = blockEnd - blockStart;
    const top = (blockStart - displayStart) * MINUTE_HEIGHT;
    const blockHeight = Math.max(blockDuration * MINUTE_HEIGHT, 36);
    const x = timelineX + 12;
    const y = timelineY + top;
    const blockWidth = timelineWidth - 24;

    context.fillStyle = rgbaFromHex(event.color, 0.55);
    context.strokeStyle = "rgba(46, 36, 27, 0.2)";
    context.lineWidth = 1;
    drawRoundedRect(context, x, y, blockWidth, blockHeight, 10);
    context.fill();
    context.stroke();

    context.fillStyle = "#5f5144";
    context.font = "12px 'Space Grotesk', sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(formatRange(event.start, event.end), x + 14, y + 8);

    context.fillStyle = "#2d2218";
    context.font = "700 14px 'Space Grotesk', sans-serif";
    const titleY = blockDuration <= 15 ? y + 8 : y + 24;
    context.fillText(event.title, x + 14, titleY);

    const durationText = formatDuration(blockDuration);
    context.font = "12px 'Space Grotesk', sans-serif";
    context.fillStyle = "#5f5144";
    const titleWidth = context.measureText(event.title).width;
    context.fillText(durationText, x + 14 + titleWidth + 8, titleY + 1);
  });

  const link = document.createElement("a");
  const fileStamp = `${state.dayStart.replace(":", "")}-${state.dayEnd.replace(":", "")}`;
  link.href = canvas.toDataURL("image/png");
  link.download = `timeline-${fileStamp}.png`;
  link.click();

  setFeedback("タイムライン画像を保存しました。");
}

function getDraggedBlockData(dataTransfer) {
  const payload = dataTransfer.getData("application/json");

  if (!payload) {
    return null;
  }

  const data = JSON.parse(payload);

  if (data.type === "pending") {
    const block = findPendingBlock(data.id);

    if (!block) {
      return null;
    }

    return {
      type: "pending",
      id: block.id,
      title: block.title,
      duration: block.duration,
      color: block.color
    };
  }

  if (data.type === "event") {
    const scheduledEvent = findEvent(data.id);

    if (!scheduledEvent) {
      return null;
    }

    return {
      type: "event",
      id: scheduledEvent.id,
      title: scheduledEvent.title,
      duration: getEventDuration(scheduledEvent),
      color: scheduledEvent.color
    };
  }

  return null;
}

function updateDropPreview(clientY, dragData) {
  if (!dragData) {
    clearDropPreview();
    return;
  }

  const startMinutes = getDropStartMinutes(clientY);
  const endMinutes = startMinutes + dragData.duration;
  const start = minutesToTime(startMinutes);
  const end = minutesToTime(endMinutes);
  const top = (startMinutes - getTimelineDisplayStart()) * MINUTE_HEIGHT;
  const height = Math.max(dragData.duration * MINUTE_HEIGHT, 36);
  const ignoredId = dragData.type === "event" ? dragData.id : null;
  const isValid = isEventInRange(start, end) && !hasOverlap(start, end, ignoredId);

  if (!dropPreview) {
    dropPreview = document.createElement("div");
    dropPreview.className = "drop-preview";
    timeline.appendChild(dropPreview);
  }

  dropPreview.style.top = `${top}px`;
  dropPreview.style.height = `${height}px`;
  dropPreview.classList.toggle("is-invalid", !isValid);
}

function placeBlock({ title, duration, color, eventId = null }, clientY) {
  const startMinutes = getDropStartMinutes(clientY);
  const endMinutes = startMinutes + duration;
  const start = minutesToTime(startMinutes);
  const end = minutesToTime(endMinutes);

  if (!isEventInRange(start, end)) {
    setFeedback("その位置には収まりません。タイムライン内に入る位置へドロップしてください。", true);
    return false;
  }

  if (hasOverlap(start, end, eventId)) {
    setFeedback("その位置には既存の予定があります。空いている位置へドロップしてください。", true);
    return false;
  }

  if (eventId) {
    const currentEvent = findEvent(eventId);

    if (!currentEvent) {
      return false;
    }

    currentEvent.start = start;
    currentEvent.end = end;
  } else {
    state.events.push({
      id: crypto.randomUUID(),
      title,
      start,
      end,
      color
    });
  }

  render();
  setFeedback(`「${title}」を ${formatRange(start, end)} に配置しました。`);
  return true;
}

function handleTimelineDrop(event) {
  event.preventDefault();
  timeline.classList.remove("is-drop-target");
  clearDropPreview();

  const dragData = getDraggedBlockData(event.dataTransfer);

  if (!dragData) {
    return;
  }

  if (dragData.type === "pending") {
    const placed = placeBlock(dragData, event.clientY);

    if (placed) {
      removePendingBlock(dragData.id);
      render();
      setFeedback(`「${dragData.title}」をタイムラインに配置しました。`);
    }

    return;
  }

  placeBlock(
    {
      title: dragData.title,
      duration: dragData.duration,
      color: dragData.color,
      eventId: dragData.id
    },
    event.clientY
  );
}

availabilityForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const nextStart = dayStartInput.value;
  const nextEnd = dayEndInput.value;

  if (!validateAvailability(nextStart, nextEnd)) {
    setFeedback("終了時間は開始時間より後にしてください。", true);
    return;
  }

  const outOfRangeEvents = state.events.filter(
    (item) => !(timeToMinutes(item.start) >= timeToMinutes(nextStart) && timeToMinutes(item.end) <= timeToMinutes(nextEnd))
  );

  if (outOfRangeEvents.length > 0) {
    setFeedback("この時間帯だと既存の予定が範囲外になります。先に予定を調整してください。", true);
    return;
  }

  state.dayStart = nextStart;
  state.dayEnd = nextEnd;
  syncDefaultRangeInputs();
  render();
  setFeedback("使える時間を更新しました。");
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = eventTitleInput.value.trim();
  const color = eventColorInput.value;
  const mode = getEventInputMode();

  if (!title) {
    setFeedback("予定タイトルを入力してください。", true);
    return;
  }

  let duration;

  if (mode === "duration") {
    duration = Number.parseInt(eventDurationInput.value, 10);

    if (!Number.isFinite(duration) || duration <= 0) {
      setFeedback("所要時間を正しく入力してください。", true);
      return;
    }
  } else {
    const start = eventStartInput.value;
    const end = eventEndInput.value;

    if (!validateAvailability(start, end)) {
      setFeedback("終了時間は開始時間より後にしてください。", true);
      return;
    }

    if (!isEventInRange(start, end)) {
      setFeedback("予定は使える時間の範囲内に入れてください。", true);
      return;
    }

    duration = timeToMinutes(end) - timeToMinutes(start);

    if (hasOverlap(start, end)) {
      setFeedback("その時間には既存の予定があります。空いている時間を指定してください。", true);
      return;
    }
  }

  if (duration > getDayDuration()) {
    setFeedback("そのブロックは使える時間全体より長いため追加できません。", true);
    return;
  }

  if (mode === "range") {
    state.events.push({
      id: crypto.randomUUID(),
      title,
      start: eventStartInput.value,
      end: eventEndInput.value,
      color
    });
    render();
    eventForm.reset();
    eventModeRangeInput.checked = true;
    eventModeDurationInput.checked = false;
    eventDurationInput.value = String(DEFAULT_DURATION_MINUTES);
    syncDefaultRangeInputs();
    eventColorInput.value = color;
    syncEventModeFields();
    setFeedback(`「${title}」をタイムラインに追加しました。`);
    return;
  }

  createPendingBlock(title, duration, color);
  render();
  eventForm.reset();
  eventModeDurationInput.checked = mode === "duration";
  eventModeRangeInput.checked = mode === "range";
  eventDurationInput.value = String(duration);
  syncDefaultRangeInputs();
  eventColorInput.value = color;
  syncEventModeFields();
  setFeedback(`「${title}」の未配置ブロックを追加しました。下からタイムラインへドラッグしてください。`);
});

eventList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-id]");

  if (!button) {
    return;
  }

  state.events = state.events.filter((item) => item.id !== button.dataset.eventId);
  render();
  setFeedback("予定を削除しました。");
});

pendingBlockList.addEventListener("dragstart", (event) => {
  const item = event.target.closest("[data-block-id]");

  if (!item) {
    return;
  }

  event.dataTransfer.setData("application/json", JSON.stringify({ type: "pending", id: item.dataset.blockId }));
  event.dataTransfer.effectAllowed = "move";
  item.classList.add("is-dragging");
});

pendingBlockList.addEventListener("dragend", (event) => {
  const item = event.target.closest("[data-block-id]");

  if (item) {
    item.classList.remove("is-dragging");
  }
});

pendingBlockList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-pending-delete]");

  if (!deleteButton) {
    return;
  }

  event.stopPropagation();
  removePendingBlock(deleteButton.dataset.pendingDelete);
  render();
  setFeedback("未配置ブロックを削除しました。");
});

timeline.addEventListener("dragstart", (event) => {
  const block = event.target.closest("[data-event-id]");

  if (!block) {
    return;
  }

  event.dataTransfer.setData("application/json", JSON.stringify({ type: "event", id: block.dataset.eventId }));
  event.dataTransfer.effectAllowed = "move";
  block.classList.add("is-dragging");
});

timeline.addEventListener("dragend", (event) => {
  const block = event.target.closest("[data-event-id]");

  if (block) {
    block.classList.remove("is-dragging");
  }

  timeline.classList.remove("is-drop-target");
  clearDropPreview();
});

timeline.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-event-delete]");

  if (!deleteButton) {
    return;
  }

  event.stopPropagation();
  const currentEvent = findEvent(deleteButton.dataset.eventDelete);

  if (!currentEvent) {
    return;
  }

  createPendingBlock(currentEvent.title, getEventDuration(currentEvent), currentEvent.color);
  state.events = state.events.filter((item) => item.id !== deleteButton.dataset.eventDelete);
  render();
  setFeedback("予定を未配置ブロックに戻しました。");
});

timeline.addEventListener("dragover", (event) => {
  if (!event.dataTransfer.types.includes("application/json")) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  timeline.classList.add("is-drop-target");
  updateDropPreview(event.clientY, getDraggedBlockData(event.dataTransfer));
});

timeline.addEventListener("dragleave", (event) => {
  if (event.relatedTarget && timeline.contains(event.relatedTarget)) {
    return;
  }

  timeline.classList.remove("is-drop-target");
  clearDropPreview();
});

timeline.addEventListener("drop", handleTimelineDrop);

resetTimelineButton.addEventListener("click", resetTimeline);
saveTimelineImageButton.addEventListener("click", saveTimelineImage);
clearPendingBlocksButton.addEventListener("click", clearPendingBlocks);
clearEventsButton.addEventListener("click", clearEvents);
eventModeDurationInput.addEventListener("change", syncEventModeFields);
eventModeRangeInput.addEventListener("change", syncEventModeFields);

window.addEventListener("resize", syncTimelineColumnHeight);

syncDefaultRangeInputs();
render();
setFeedback("フォームで未配置ブロックを作って、下からタイムラインへドラッグしてください。配置済みブロックもドラッグで動かせます。");
