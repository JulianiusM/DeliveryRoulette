/**
 * Test data for Lieferando parsing unit tests.
 */
import fs from 'fs';
import path from 'path';

const fixturesDir = path.join(__dirname, '../../fixtures/lieferando');

export const listingHtml = fs.readFileSync(path.join(fixturesDir, 'listing.html'), 'utf-8');
export const menuHtml = fs.readFileSync(path.join(fixturesDir, 'menu.html'), 'utf-8');
export const listingRealHtml = fs.readFileSync(path.join(fixturesDir, 'listing-real.html'), 'utf-8');
export const menuRealHtml = fs.readFileSync(path.join(fixturesDir, 'menu-real.html'), 'utf-8');

export const expectedListingRestaurants = [
    {
        description: 'first restaurant: Pizza Palast',
        name: 'Pizza Palast',
        menuUrlSuffix: '/en/menu/pizza-palast',
        cuisines: 'Italian, Pizza',
    },
    {
        description: 'second restaurant: Green Bowl',
        name: 'Green Bowl',
        menuUrlSuffix: '/en/menu/green-bowl',
        cuisines: 'Healthy, Vegan',
    },
];

export const expectedRealListingRestaurants = [
    {
        description: 'real listing: Pizza La Scalla',
        name: 'Pizza La Scalla',
        menuUrlSuffix: '/en/menu/pizza-la-scalla-regensburg',
        cuisines: 'Italian, Indian',
    },
    {
        description: 'real listing: Pizza 4 You',
        name: 'Pizza 4 You',
        menuUrlSuffix: '/en/menu/pizza-4-you-regensburg',
        cuisines: 'Italian style pizza, Pasta',
    },
    {
        description: 'real listing: Raj Mahal',
        name: 'Raj Mahal',
        menuUrlSuffix: '/en/menu/raj-mahal-neu',
        cuisines: 'Indian',
    },
];

export const listingRestaurantPathHtml = `
<!doctype html>
<html>
  <body>
    <div data-qa="restaurant-card">
      <a href="/en/restaurant/burger-point-neutraubling" data-qa="restaurant-card-burger-point-link">
        <span data-qa="restaurant-info-name">Burger Point</span>
      </a>
      <span data-qa="restaurant-cuisine">Burgers</span>
    </div>
    <div data-qa="restaurant-card">
      <a href="/en/restaurant/sushi-time-neutraubling" data-qa="restaurant-card-sushi-time-link">
        <span data-qa="restaurant-info-name">Sushi Time</span>
      </a>
      <span data-qa="restaurant-cuisine">Sushi</span>
    </div>
  </body>
</html>
`;

export const expectedRestaurantPathListingRestaurants = [
    {
        description: 'restaurant-path listing: Burger Point',
        name: 'Burger Point',
        menuUrlSuffix: '/en/restaurant/burger-point-neutraubling',
        cuisines: 'Burgers',
    },
    {
        description: 'restaurant-path listing: Sushi Time',
        name: 'Sushi Time',
        menuUrlSuffix: '/en/restaurant/sushi-time-neutraubling',
        cuisines: 'Sushi',
    },
];

export const listingEmbeddedJsonHtml = `
<!doctype html>
<html>
  <body>
    <script id="__NEXT_DATA__" type="application/json">
      {
        "props": {
          "pageProps": {
            "restaurants": [
              {"name": "Falafel House", "url": "/en/restaurant/falafel-house-neutraubling"},
              {"displayName": "Pizza Taxi", "href": "https://www.lieferando.de/en/menu/pizza-taxi-neutraubling"}
            ]
          }
        }
      }
    </script>
  </body>
</html>
`;

export const expectedEmbeddedJsonListingRestaurants = [
    {
        description: 'embedded json listing: Falafel House',
        name: 'Falafel House',
        menuUrlSuffix: '/en/restaurant/falafel-house-neutraubling',
    },
    {
        description: 'embedded json listing: Pizza Taxi',
        name: 'Pizza Taxi',
        menuUrlSuffix: '/en/menu/pizza-taxi-neutraubling',
    },
];

export const listingNextDataHtml = `
<!doctype html>
<html>
  <body>
    <script id="__NEXT_DATA__" type="application/json">
      {
        "props": {
          "appProps": {
            "preloadedState": {
              "discovery": {
                "restaurantList": {
                  "filteredRestaurantIds": ["1", "2", "3"],
                  "restaurantData": {
                    "1": {
                      "name": "Burger Point",
                      "uniqueName": "burger-point-neutraubling",
                      "address": {"firstLine": "Main Street 1", "city": "Neutraubling", "postalCode": "93073"},
                      "cuisines": [{"name": "Burgers"}],
                      "availability": {"delivery": {"isOpen": true, "nextAvailability": {"from": "2026-03-01T11:00:00"}}}
                    },
                    "2": {
                      "name": "Pizza Hub",
                      "uniqueName": "pizza-hub-neutraubling",
                      "address": {"firstLine": "Second Street 2", "city": "Regensburg", "postalCode": "93049"},
                      "cuisines": [{"name": "Pizza"}, {"name": "Italian"}],
                      "availability": {"delivery": {"isOpen": false, "nextAvailability": {"from": "2026-03-01T16:00:00"}}}
                    },
                    "3": {
                      "name": "Sushi Time",
                      "uniqueName": "sushi-time-neutraubling",
                      "address": {"firstLine": "Third Street 3", "city": "Neutraubling", "postalCode": "93073"},
                      "cuisines": [{"name": "Sushi"}],
                      "availability": {"delivery": {"isOpen": true, "nextAvailability": {"from": "2026-03-01T12:00:00"}}}
                    }
                  }
                }
              }
            }
          }
        }
      }
    </script>
  </body>
</html>
`;

export const expectedNextDataListingRestaurants = [
    {
        description: 'next data listing: Burger Point',
        name: 'Burger Point',
        menuUrlSuffix: '/en/menu/burger-point-neutraubling',
        address: 'Main Street 1',
        city: 'Neutraubling',
        postalCode: '93073',
        cuisines: 'Burgers',
    },
    {
        description: 'next data listing: Pizza Hub',
        name: 'Pizza Hub',
        menuUrlSuffix: '/en/menu/pizza-hub-neutraubling',
        address: 'Second Street 2',
        city: 'Regensburg',
        postalCode: '93049',
        cuisines: 'Pizza, Italian',
    },
    {
        description: 'next data listing: Sushi Time',
        name: 'Sushi Time',
        menuUrlSuffix: '/en/menu/sushi-time-neutraubling',
        address: 'Third Street 3',
        city: 'Neutraubling',
        postalCode: '93073',
        cuisines: 'Sushi',
    },
];

export const menuNextDataDetailsHtml = `
<!doctype html>
<html>
  <head><title>Sample Restaurant | Lieferando.de</title></head>
  <body>
    <script id="__NEXT_DATA__" type="application/json">
      {
        "props": {
          "appProps": {
            "preloadedState": {
              "menu": {
                "restaurant": {
                  "cdn": {
                    "restaurant": {
                      "restaurantInfo": {
                        "location": {"address": "Sample Street 9", "city": "Neutraubling", "postCode": "93073"},
                        "restaurantOpeningTimes": [
                          {
                            "serviceType": "delivery",
                            "timesPerDay": [
                              {"dayOfWeek": "Monday", "times": [{"fromLocalTime": "11:00", "toLocalTime": "22:00"}]},
                              {"dayOfWeek": "Tuesday", "times": []}
                            ]
                          }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    </script>
  </body>
</html>
`;

export const menuNextDataCategoriesHtml = `
<!doctype html>
<html>
  <head><title>Sample Restaurant | Lieferando.de</title></head>
  <body>
    <script id="__NEXT_DATA__" type="application/json">
      {
        "props": {
          "appProps": {
            "preloadedState": {
              "menu": {
                "restaurant": {
                  "cdn": {
                    "restaurant": {
                      "menus": [
                        {
                          "categories": [
                            {"id": "cat-1", "name": "Burgers", "itemIds": ["item-1|cat-1", "item-2|cat-1"]},
                            {"id": "cat-2", "name": "Sides", "itemIds": ["item-3"]}
                          ]
                        }
                      ]
                    },
                    "items": {
                      "item-1|cat-1": {
                        "id": "item-1|cat-1",
                        "name": "Classic Burger",
                        "description": "Beef patty",
                        "variations": [{"basePrice": 8.5}]
                      },
                      "item-2": {
                        "id": "item-2",
                        "name": "Veggie Burger",
                        "description": "Plant based",
                        "variations": [{"basePrice": "9.2", "currencyCode": "EUR"}]
                      },
                      "item-3": {
                        "id": "item-3",
                        "name": "Fries",
                        "description": "Crispy",
                        "variations": [{"price": 3.1}]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    </script>
  </body>
</html>
`;

export const expectedNextDataMenuCategories = [
    {
        description: 'next data menu category: Burgers',
        name: 'Burgers',
        itemCount: 2,
        firstItem: {name: 'Classic Burger', description: 'Beef patty', price: 8.5, currency: 'EUR'},
    },
    {
        description: 'next data menu category: Sides',
        name: 'Sides',
        itemCount: 1,
        firstItem: {name: 'Fries', description: 'Crispy', price: 3.1, currency: 'EUR'},
    },
];

export const expectedMenuCategories = [
    {
        description: 'first category: Vegan',
        name: 'Vegan',
        itemCount: 1,
        firstItem: {name: 'Vegan Burger', description: 'mit pflanzlichem Patty', price: 9.90, currency: 'EUR'},
    },
    {
        description: 'second category: Salate',
        name: 'Salate',
        itemCount: 1,
        firstItem: {name: 'Gemischter Salat', description: 'frisch und knackig', price: 6.50, currency: 'EUR'},
    },
];

export const expectedRealMenuCategories = [
    {
        description: 'real menu category: Salads',
        name: 'Salads',
        itemCount: 2,
        firstItem: {name: 'Rocket Salad', description: 'with green salad, rocket, tomatoes, mozzarella', price: 8.80, currency: 'EUR'},
    },
    {
        description: 'real menu category: Pizza',
        name: 'Pizza',
        itemCount: 1,
        firstItem: {name: 'Margherita', description: 'with tomato sauce and mozzarella', price: 7.90, currency: 'EUR'},
    },
];

export const expectedRawTextContents = [
    'Vegan',
    'Vegan Burger',
    'mit pflanzlichem Patty',
    'Salate',
    'Gemischter Salat',
    'frisch und knackig',
];
