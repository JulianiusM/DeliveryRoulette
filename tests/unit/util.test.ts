import {getSessionUserId} from '../../src/modules/lib/util';
import {sessionUserIdData} from '../data/unit/utilData';

describe('util helpers', () => {
    test.each(sessionUserIdData)('$description', ({session, expected}) => {
        expect(getSessionUserId(session as any)).toBe(expected);
    });
});

