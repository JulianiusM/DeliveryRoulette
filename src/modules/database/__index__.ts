// ⚠️ AUTO-GENERATED FILE — do not edit manually.
import { MenuCategory } from "./entities/menu/MenuCategory";
import { MenuItem } from "./entities/menu/MenuItem";
import { Restaurant } from "./entities/restaurant/Restaurant";
import { Session } from "./entities/session/Session";
import { User } from "./entities/user/User";
import { UserPreference } from "./entities/user/UserPreference";
import { CreateRestaurant1740100000000 } from "../../migrations/1740100000000-CreateRestaurant";
import { CreateMenuCategoryAndItem1740200000000 } from "../../migrations/1740200000000-CreateMenuCategoryAndItem";
import { CreateUserPreference1740300000000 } from "../../migrations/1740300000000-CreateUserPreference";

export const entities = [MenuCategory, MenuItem, Restaurant, Session, User, UserPreference];

export const migrations = [CreateRestaurant1740100000000, CreateMenuCategoryAndItem1740200000000, CreateUserPreference1740300000000];

export const subscribers = [];
