// ⚠️ AUTO-GENERATED FILE — do not edit manually.
import { MenuCategory } from "./entities/menu/MenuCategory";
import { MenuItem } from "./entities/menu/MenuItem";
import { Restaurant } from "./entities/restaurant/Restaurant";
import { Session } from "./entities/session/Session";
import { User } from "./entities/user/User";
import { CreateRestaurant1740100000000 } from "../../migrations/1740100000000-CreateRestaurant";
import { CreateMenuCategoryAndItem1740200000000 } from "../../migrations/1740200000000-CreateMenuCategoryAndItem";

export const entities = [MenuCategory, MenuItem, Restaurant, Session, User];

export const migrations = [CreateRestaurant1740100000000, CreateMenuCategoryAndItem1740200000000];

export const subscribers = [];
