// ⚠️ AUTO-GENERATED FILE — do not edit manually.
import { DietInferenceResult } from "./entities/diet/DietInferenceResult";
import { DietManualOverride } from "./entities/diet/DietManualOverride";
import { DietTag } from "./entities/diet/DietTag";
import { MenuCategory } from "./entities/menu/MenuCategory";
import { MenuItem } from "./entities/menu/MenuItem";
import { Restaurant } from "./entities/restaurant/Restaurant";
import { RestaurantProviderRef } from "./entities/restaurant/RestaurantProviderRef";
import { Session } from "./entities/session/Session";
import { SuggestionHistory } from "./entities/suggestion/SuggestionHistory";
import { SyncAlert } from "./entities/sync/SyncAlert";
import { SyncJob } from "./entities/sync/SyncJob";
import { User } from "./entities/user/User";
import { UserDietPreference } from "./entities/user/UserDietPreference";
import { UserPreference } from "./entities/user/UserPreference";
import { UserRestaurantPreference } from "./entities/user/UserRestaurantPreference";
import { CreateRestaurant1740100000000 } from "../../migrations/1740100000000-CreateRestaurant";
import { CreateMenuCategoryAndItem1740200000000 } from "../../migrations/1740200000000-CreateMenuCategoryAndItem";
import { CreateUserPreference1740300000000 } from "../../migrations/1740300000000-CreateUserPreference";
import { CreateRestaurantProviderRef1740400000000 } from "../../migrations/1740400000000-CreateRestaurantProviderRef";
import { CreateDietTag1740500000000 } from "../../migrations/1740500000000-CreateDietTag";
import { CreateDietInferenceResult1740600000000 } from "../../migrations/1740600000000-CreateDietInferenceResult";
import { CreateDietManualOverride1740700000000 } from "../../migrations/1740700000000-CreateDietManualOverride";
import { CreateUserDietPreference1740800000000 } from "../../migrations/1740800000000-CreateUserDietPreference";
import { CreateSuggestionHistory1740900000000 } from "../../migrations/1740900000000-CreateSuggestionHistory";
import { CreateUserRestaurantPreference1741000000000 } from "../../migrations/1741000000000-CreateUserRestaurantPreference";
import { CreateSyncJob1741100000000 } from "../../migrations/1741100000000-CreateSyncJob";
import { CreateSyncAlert1741200000000 } from "../../migrations/1741200000000-CreateSyncAlert";

export const entities = [DietInferenceResult, DietManualOverride, DietTag, MenuCategory, MenuItem, Restaurant, RestaurantProviderRef, Session, SuggestionHistory, SyncAlert, SyncJob, User, UserDietPreference, UserPreference, UserRestaurantPreference];

export const migrations = [CreateRestaurant1740100000000, CreateMenuCategoryAndItem1740200000000, CreateUserPreference1740300000000, CreateRestaurantProviderRef1740400000000, CreateDietTag1740500000000, CreateDietInferenceResult1740600000000, CreateDietManualOverride1740700000000, CreateUserDietPreference1740800000000, CreateSuggestionHistory1740900000000, CreateUserRestaurantPreference1741000000000, CreateSyncJob1741100000000, CreateSyncAlert1741200000000];

export const subscribers = [];
