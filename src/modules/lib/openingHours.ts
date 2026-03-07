interface TimeRange {
    startMinute: number;
    endMinute: number;
}

interface ServiceSchedule {
    parsedDayEntries: number;
    dayEntries: Set<number>;
    rangesByDay: Map<number, TimeRange[]>;
    displayRangesByDay: Map<number, TimeRange[]>;
}

interface RollingInterval {
    startMinute: number;
    endMinute: number;
}

export interface OpenNowOptions {
    now?: Date;
    timeZone?: string;
    preferredService?: string;
}

export interface OpeningHoursDayView {
    dayIndex: number;
    dayLabel: string;
    isToday: boolean;
    isClosed: boolean;
    rangeLabels: string[];
}

export interface OpeningHoursServiceView {
    serviceKey: string;
    serviceLabel: string;
    isPreferred: boolean;
    days: OpeningHoursDayView[];
}

export interface OpeningHoursStatus {
    state: 'open' | 'closed' | 'unknown';
    isOpenNow: boolean | null;
    serviceKey?: string;
    serviceLabel?: string;
    summaryLabel: string;
    detailLabel: string;
    relativeLabel?: string;
}

export interface OpeningHoursPresentation {
    status: OpeningHoursStatus;
    services: OpeningHoursServiceView[];
}

const DEFAULT_TIME_ZONE = 'Europe/Berlin';
const DELIVERY_SERVICE_KEY = 'delivery';
const DAY_ORDER_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, string> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
};

const DAY_INDEX_BY_NAME: Record<string, number> = {
    sunday: 0,
    sun: 0,
    sonntag: 0,
    son: 0,
    monday: 1,
    mon: 1,
    montag: 1,
    mo: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    dienstag: 2,
    di: 2,
    wednesday: 3,
    wed: 3,
    mittwoch: 3,
    mi: 3,
    thursday: 4,
    thu: 4,
    thur: 4,
    thurs: 4,
    donnerstag: 4,
    do: 4,
    friday: 5,
    fri: 5,
    freitag: 5,
    fr: 5,
    saturday: 6,
    sat: 6,
    samstag: 6,
    sa: 6,
};

/**
 * Resolve a default timezone for restaurant-local calculations.
 * Currently all imported Lieferando restaurants are DE-local.
 */
export function resolveRestaurantTimeZone(country?: string | null): string {
    const normalizedCountry = (country ?? '').trim().toUpperCase();
    if (!normalizedCountry || normalizedCountry === 'DE') {
        return DEFAULT_TIME_ZONE;
    }
    return 'UTC';
}

/**
 * Compute whether a restaurant is currently open based on stored opening-hours text.
 * Returns null when the opening-hours format cannot be interpreted.
 */
export function computeIsOpenNowFromOpeningHours(
    openingHours?: string | null,
    options: OpenNowOptions = {},
): boolean | null {
    return getOpeningHoursPresentation(openingHours, options).status.isOpenNow;
}

export function getOpeningHoursPresentation(
    openingHours?: string | null,
    options: OpenNowOptions = {},
): OpeningHoursPresentation {
    if (!openingHours || !openingHours.trim()) {
        return {
            status: {
                state: 'unknown',
                isOpenNow: null,
                summaryLabel: 'Hours unknown',
                detailLabel: 'No opening hours stored for this restaurant.',
            },
            services: [],
        };
    }

    const services = parseOpeningHours(openingHours);
    const parsedSchedules = [...services.entries()].filter(([, schedule]) => schedule.parsedDayEntries > 0);
    if (parsedSchedules.length === 0) {
        return {
            status: {
                state: 'unknown',
                isOpenNow: null,
                summaryLabel: 'Hours unknown',
                detailLabel: 'Opening hours could not be interpreted from the stored provider text.',
            },
            services: [],
        };
    }

    const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
    const local = getLocalDayAndMinute(options.now ?? new Date(), timeZone);
    if (!local) {
        return {
            status: {
                state: 'unknown',
                isOpenNow: null,
                summaryLabel: 'Hours unknown',
                detailLabel: 'Local restaurant time could not be resolved.',
            },
            services: buildServiceViews(parsedSchedules, null, options.preferredService),
        };
    }

    const selectedSchedule = selectSchedule(parsedSchedules, local, options.preferredService);
    return {
        status: buildOpeningHoursStatus(selectedSchedule, local),
        services: buildServiceViews(parsedSchedules, local.dayIndex, selectedSchedule?.serviceKey ?? options.preferredService),
    };
}

function parseOpeningHours(openingHours: string): Map<string, ServiceSchedule> {
    const result = new Map<string, ServiceSchedule>();

    for (const rawLine of openingHours.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;

        let serviceKey = 'default';
        let dayPayload = line;

        const serviceMatch = line.match(/^([^:]+):\s*(.+)$/);
        if (serviceMatch) {
            const candidateService = serviceMatch[1].trim();
            if (!looksLikeDayName(candidateService)) {
                serviceKey = normalizeServiceName(candidateService);
                dayPayload = serviceMatch[2].trim();
            }
        }

        if (!dayPayload) continue;

        const schedule = getOrCreateSchedule(result, serviceKey);
        parseServiceDayPayload(dayPayload, schedule);
    }

    return result;
}

function parseServiceDayPayload(payload: string, schedule: ServiceSchedule): void {
    const segments = payload
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean);

    for (const segment of segments) {
        const dayMatch = segment.match(/^([A-Za-z]+)\s*(.*)$/);
        if (!dayMatch) continue;

        const dayKey = normalizeDayName(dayMatch[1]);
        const dayIndex = DAY_INDEX_BY_NAME[dayKey];
        if (dayIndex === undefined) continue;

        schedule.parsedDayEntries += 1;
        schedule.dayEntries.add(dayIndex);

        const tail = dayMatch[2].trim();
        if (!tail || /\b(closed|geschlossen)\b/i.test(tail)) {
            continue;
        }

        const ranges = extractTimeRanges(tail);
        for (const range of ranges) {
            addDisplayRange(schedule.displayRangesByDay, dayIndex, range.startMinute, range.endMinute);
            addRange(schedule.rangesByDay, dayIndex, range.startMinute, range.endMinute);
        }
    }
}

function extractTimeRanges(text: string): TimeRange[] {
    const ranges: TimeRange[] = [];
    const regex = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        const start = parseMinute(match[1], match[2], false);
        const end = parseMinute(match[3], match[4], true);
        if (start === null || end === null) continue;
        ranges.push({startMinute: start, endMinute: end});
    }

    return ranges;
}

function addDisplayRange(
    byDay: Map<number, TimeRange[]>,
    dayIndex: number,
    startMinute: number,
    endMinute: number,
): void {
    pushRange(byDay, dayIndex, {startMinute, endMinute});
}

function addRange(
    byDay: Map<number, TimeRange[]>,
    dayIndex: number,
    startMinute: number,
    endMinute: number,
): void {
    if (startMinute === endMinute) {
        pushRange(byDay, dayIndex, {startMinute: 0, endMinute: 1440});
        return;
    }

    if (startMinute < endMinute) {
        pushRange(byDay, dayIndex, {startMinute, endMinute});
        return;
    }

    pushRange(byDay, dayIndex, {startMinute, endMinute: 1440});
    pushRange(byDay, (dayIndex + 1) % 7, {startMinute: 0, endMinute});
}

function pushRange(byDay: Map<number, TimeRange[]>, dayIndex: number, range: TimeRange): void {
    const current = byDay.get(dayIndex);
    if (current) {
        current.push(range);
        return;
    }
    byDay.set(dayIndex, [range]);
}

function getOrCreateSchedule(
    target: Map<string, ServiceSchedule>,
    serviceKey: string,
): ServiceSchedule {
    const existing = target.get(serviceKey);
    if (existing) return existing;
    const created: ServiceSchedule = {
        parsedDayEntries: 0,
        dayEntries: new Set<number>(),
        rangesByDay: new Map<number, TimeRange[]>(),
        displayRangesByDay: new Map<number, TimeRange[]>(),
    };
    target.set(serviceKey, created);
    return created;
}

function getLocalDayAndMinute(now: Date, timeZone: string): {dayIndex: number; minuteOfDay: number} | null {
    const weekday = new Intl.DateTimeFormat('en-US', {timeZone, weekday: 'long'})
        .format(now)
        .toLowerCase();
    const dayIndex = DAY_INDEX_BY_NAME[weekday];
    if (dayIndex === undefined) return null;

    const timeParts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(now);

    const hour = Number.parseInt(timeParts.find((part) => part.type === 'hour')?.value ?? '', 10);
    const minute = Number.parseInt(timeParts.find((part) => part.type === 'minute')?.value ?? '', 10);

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
        return null;
    }

    return {dayIndex, minuteOfDay: hour * 60 + minute};
}

function selectSchedule(
    parsedSchedules: Array<[string, ServiceSchedule]>,
    local: {dayIndex: number; minuteOfDay: number},
    preferredService?: string,
): {serviceKey: string; schedule: ServiceSchedule} | null {
    const normalizedPreferred = normalizeServiceName(preferredService || DELIVERY_SERVICE_KEY);
    const preferredEntry = parsedSchedules.find(([serviceKey]) => serviceKey === normalizedPreferred);
    if (preferredEntry) {
        return {serviceKey: preferredEntry[0], schedule: preferredEntry[1]};
    }

    const ranked = parsedSchedules
        .map(([serviceKey, schedule]) => {
            const intervals = buildRollingIntervals(schedule, local.dayIndex);
            const currentInterval = intervals.find((interval) => (
                local.minuteOfDay >= interval.startMinute && local.minuteOfDay < interval.endMinute
            ));
            const nextInterval = intervals.find((interval) => interval.startMinute > local.minuteOfDay);

            return {
                serviceKey,
                schedule,
                isOpenNow: !!currentInterval,
                nextStartMinute: nextInterval?.startMinute ?? Number.POSITIVE_INFINITY,
            };
        })
        .sort((left, right) => {
            const openRank = Number(right.isOpenNow) - Number(left.isOpenNow);
            if (openRank !== 0) {
                return openRank;
            }
            if (left.nextStartMinute !== right.nextStartMinute) {
                return left.nextStartMinute - right.nextStartMinute;
            }
            return left.serviceKey.localeCompare(right.serviceKey);
        });

    if (ranked.length === 0) {
        return null;
    }

    return {
        serviceKey: ranked[0].serviceKey,
        schedule: ranked[0].schedule,
    };
}

function buildOpeningHoursStatus(
    selectedSchedule: {serviceKey: string; schedule: ServiceSchedule} | null,
    local: {dayIndex: number; minuteOfDay: number},
): OpeningHoursStatus {
    if (!selectedSchedule) {
        return {
            state: 'unknown',
            isOpenNow: null,
            summaryLabel: 'Hours unknown',
            detailLabel: 'No structured opening schedule is available.',
        };
    }

    const {serviceKey, schedule} = selectedSchedule;
    const serviceLabel = formatServiceLabel(serviceKey);
    const intervals = buildRollingIntervals(schedule, local.dayIndex);
    const currentInterval = intervals.find((interval) => (
        local.minuteOfDay >= interval.startMinute && local.minuteOfDay < interval.endMinute
    ));

    if (currentInterval) {
        const closeAt = describeTransition(currentInterval.endMinute, local.dayIndex);
        return {
            state: 'open',
            isOpenNow: true,
            serviceKey,
            serviceLabel,
            summaryLabel: 'Open now',
            detailLabel: `${serviceLabel} until ${closeAt.dayAwareTimeLabel}`,
            relativeLabel: `${formatDurationMinutes(currentInterval.endMinute - local.minuteOfDay)} left`,
        };
    }

    const nextInterval = intervals.find((interval) => interval.startMinute > local.minuteOfDay);
    if (nextInterval) {
        const nextOpen = describeTransition(nextInterval.startMinute, local.dayIndex);
        return {
            state: 'closed',
            isOpenNow: false,
            serviceKey,
            serviceLabel,
            summaryLabel: 'Closed now',
            detailLabel: `${serviceLabel} opens ${nextOpen.fullLabel}`,
            relativeLabel: `in ${formatDurationMinutes(nextInterval.startMinute - local.minuteOfDay)}`,
        };
    }

    return {
        state: 'closed',
        isOpenNow: false,
        serviceKey,
        serviceLabel,
        summaryLabel: 'Closed now',
        detailLabel: `No upcoming ${serviceLabel.toLowerCase()} slot found in the stored weekly schedule.`,
    };
}

function buildServiceViews(
    parsedSchedules: Array<[string, ServiceSchedule]>,
    localDayIndex: number | null,
    preferredService?: string,
): OpeningHoursServiceView[] {
    const normalizedPreferred = normalizeServiceName(preferredService || DELIVERY_SERVICE_KEY);

    return parsedSchedules
        .sort(([leftKey], [rightKey]) => compareServiceKeys(leftKey, rightKey, normalizedPreferred))
        .map(([serviceKey, schedule]) => ({
            serviceKey,
            serviceLabel: formatServiceLabel(serviceKey),
            isPreferred: serviceKey === normalizedPreferred,
            days: DAY_ORDER_MONDAY_FIRST
                .filter((dayIndex) => schedule.dayEntries.has(dayIndex))
                .map((dayIndex) => {
                    const ranges = [...(schedule.displayRangesByDay.get(dayIndex) ?? [])]
                        .sort((left, right) => left.startMinute - right.startMinute);
                    const rangeLabels = ranges.length > 0
                        ? ranges.map((range) => formatRangeLabel(range))
                        : ['Closed'];

                    return {
                        dayIndex,
                        dayLabel: DAY_LABELS[dayIndex],
                        isToday: localDayIndex === dayIndex,
                        isClosed: ranges.length === 0,
                        rangeLabels,
                    };
                }),
        }));
}

function compareServiceKeys(left: string, right: string, preferred: string): number {
    const rank = (value: string): number => {
        if (value === preferred) return 0;
        if (value === DELIVERY_SERVICE_KEY) return 1;
        if (value === 'pickup') return 2;
        if (value === 'default') return 3;
        return 4;
    };

    const rankDiff = rank(left) - rank(right);
    if (rankDiff !== 0) {
        return rankDiff;
    }
    return left.localeCompare(right);
}

function buildRollingIntervals(schedule: ServiceSchedule, localDayIndex: number): RollingInterval[] {
    const intervals: RollingInterval[] = [];

    for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
        const actualDayIndex = (localDayIndex + dayOffset) % 7;
        const ranges = schedule.rangesByDay.get(actualDayIndex) ?? [];
        for (const range of ranges) {
            intervals.push({
                startMinute: (dayOffset * 1440) + range.startMinute,
                endMinute: (dayOffset * 1440) + range.endMinute,
            });
        }
    }

    intervals.sort((left, right) => left.startMinute - right.startMinute);
    return mergeIntervals(intervals);
}

function mergeIntervals(intervals: RollingInterval[]): RollingInterval[] {
    if (intervals.length === 0) {
        return [];
    }

    const merged: RollingInterval[] = [{...intervals[0]}];
    for (const interval of intervals.slice(1)) {
        const current = merged[merged.length - 1];
        if (interval.startMinute <= current.endMinute) {
            current.endMinute = Math.max(current.endMinute, interval.endMinute);
            continue;
        }
        merged.push({...interval});
    }

    return merged;
}

function describeTransition(absMinute: number, localDayIndex: number): {
    timeLabel: string;
    dayAwareTimeLabel: string;
    fullLabel: string;
} {
    const dayOffset = Math.floor(absMinute / 1440);
    const minuteOfDay = absMinute % 1440;
    const timeLabel = formatMinuteLabel(minuteOfDay);
    const dayLabel = DAY_LABELS[(localDayIndex + dayOffset) % 7];

    if (dayOffset === 0) {
        return {
            timeLabel,
            dayAwareTimeLabel: `${timeLabel} today`,
            fullLabel: `today at ${timeLabel}`,
        };
    }

    if (dayOffset === 1) {
        return {
            timeLabel,
            dayAwareTimeLabel: `${timeLabel} tomorrow`,
            fullLabel: `tomorrow at ${timeLabel}`,
        };
    }

    return {
        timeLabel,
        dayAwareTimeLabel: `${timeLabel} on ${dayLabel}`,
        fullLabel: `${dayLabel} at ${timeLabel}`,
    };
}

function formatDurationMinutes(totalMinutes: number): string {
    const safeMinutes = Math.max(0, Math.round(totalMinutes));
    const days = Math.floor(safeMinutes / 1440);
    const hours = Math.floor((safeMinutes % 1440) / 60);
    const minutes = safeMinutes % 60;
    const parts: string[] = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(' ');
}

function formatRangeLabel(range: TimeRange): string {
    return `${formatMinuteLabel(range.startMinute)}-${formatMinuteLabel(range.endMinute)}`;
}

function formatMinuteLabel(minuteOfDay: number): string {
    if (minuteOfDay === 1440) {
        return '24:00';
    }

    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatServiceLabel(serviceKey: string): string {
    const normalized = normalizeServiceName(serviceKey);
    if (normalized === DELIVERY_SERVICE_KEY) return 'Delivery';
    if (normalized === 'pickup') return 'Pickup';
    if (normalized === 'default') return 'Restaurant';
    return normalized
        .split(/[^a-z0-9]+/i)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function parseMinute(hoursRaw: string, minutesRaw: string, allow24End: boolean): number | null {
    const hours = Number.parseInt(hoursRaw, 10);
    const minutes = Number.parseInt(minutesRaw, 10);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (minutes < 0 || minutes > 59) return null;

    if (allow24End && hours === 24 && minutes === 0) {
        return 1440;
    }

    if (hours < 0 || hours > 23) return null;
    return hours * 60 + minutes;
}

function normalizeServiceName(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeDayName(value: string): string {
    return value.trim().replace(/\.$/, '').toLowerCase();
}

function looksLikeDayName(value: string): boolean {
    return DAY_INDEX_BY_NAME[normalizeDayName(value)] !== undefined;
}

