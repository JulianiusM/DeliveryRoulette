interface TimeRange {
    startMinute: number;
    endMinute: number;
}

interface ServiceSchedule {
    parsedDayEntries: number;
    rangesByDay: Map<number, TimeRange[]>;
}

export interface OpenNowOptions {
    now?: Date;
    timeZone?: string;
    preferredService?: string;
}

const DEFAULT_TIME_ZONE = 'Europe/Berlin';
const DELIVERY_SERVICE_KEY = 'delivery';

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
    if (!openingHours || !openingHours.trim()) {
        return null;
    }

    const services = parseOpeningHours(openingHours);
    if (services.size === 0) {
        return null;
    }

    const now = options.now ?? new Date();
    const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
    const local = getLocalDayAndMinute(now, timeZone);
    if (!local) {
        return null;
    }

    const preferredService = normalizeServiceName(options.preferredService || DELIVERY_SERVICE_KEY);
    const preferredSchedule = services.get(preferredService);
    if (preferredSchedule && preferredSchedule.parsedDayEntries > 0) {
        return isOpenForSchedule(preferredSchedule, local.dayIndex, local.minuteOfDay);
    }

    const candidateSchedules = [...services.values()].filter((schedule) => schedule.parsedDayEntries > 0);
    if (candidateSchedules.length === 0) {
        return null;
    }

    return candidateSchedules.some((schedule) =>
        isOpenForSchedule(schedule, local.dayIndex, local.minuteOfDay),
    );
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

        const tail = dayMatch[2].trim();
        if (!tail || /\b(closed|geschlossen)\b/i.test(tail)) {
            continue;
        }

        const ranges = extractTimeRanges(tail);
        for (const range of ranges) {
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
        rangesByDay: new Map<number, TimeRange[]>(),
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

function isOpenForSchedule(schedule: ServiceSchedule, dayIndex: number, minuteOfDay: number): boolean {
    const ranges = schedule.rangesByDay.get(dayIndex) ?? [];
    return ranges.some((range) => minuteOfDay >= range.startMinute && minuteOfDay < range.endMinute);
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
