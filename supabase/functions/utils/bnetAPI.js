"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEquipment = fetchEquipment;
exports.getItem = getItem;
var constants_ts_1 = require("./constants.ts");
var npm_axios_1_6_7_1 = require("npm:axios@1.6.7");
function fetchEquipment(characterName, token) {
    return __awaiter(this, void 0, void 0, function () {
        var url, query, response, text, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!characterName) {
                        throw new Error('WoWService::fetchEquipment - characterName parameter is required');
                    }
                    url = "https://eu.api.blizzard.com/profile/wow/character/".concat(constants_ts_1.REALM_SLUG, "/").concat(encodeURIComponent(characterName), "/equipment");
                    query = new URLSearchParams({
                        locale: constants_ts_1.BLIZZARD_API_LOCALE,
                        namespace: constants_ts_1.BLIZZARD_API_PROFILE_NAMESPACE
                    });
                    return [4 /*yield*/, fetch("".concat(url, "?").concat(query), {
                            headers: {
                                'Authorization': 'Bearer ' + token
                            }
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    text = _a.sent();
                    throw new Error('WoWService::fetchEquipment - Error fetching equipment: ' + text);
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    data = _a.sent();
                    return [2 /*return*/, __assign(__assign({}, data), { characterName: characterName })];
            }
        });
    });
}
function knownItemLevelQuality(itemId) {
    var _a;
    var knownItemLevels = {
        215161: 45,
        210781: 30,
        211450: 33,
        215111: 45,
        999999: 0,
        0: 0,
        216494: 45,
        213409: 45,
        213350: 45,
    };
    return (_a = knownItemLevels[itemId]) !== null && _a !== void 0 ? _a : 0;
}
function fetchItemDetails(token, itemId) {
    return __awaiter(this, void 0, void 0, function () {
        var url, itemDetails, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!token) {
                        console.error('No token provided for fetching item details');
                        throw new Error('No token provided for fetching item details');
                    }
                    url = "https://eu.api.blizzard.com/data/wow/item/".concat(itemId, "?namespace=").concat(constants_ts_1.BLIZZARD_API_STATIC_NAMESPACE, "&locale=").concat(constants_ts_1.BLIZZARD_API_LOCALE) //createBlizzardItemFetchUrl(itemId);
                    ;
                    itemDetails = { quality: {}, level: knownItemLevelQuality(itemId) };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, npm_axios_1_6_7_1.default.get("".concat(url), {
                            headers: { 'Authorization': 'Bearer ' + token }
                        })];
                case 2:
                    data = (_a.sent()).data;
                    itemDetails = data;
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.error('Error fetching item details:', itemId, e_1);
                    console.error('try this in postman', url, 'with token', token);
                    return [2 /*return*/, itemDetails];
                case 4:
                    if (itemDetails.quality.level === 0) {
                        console.error('Item quality not found for item:', itemId);
                    }
                    return [2 /*return*/, itemDetails];
            }
        });
    });
}
function fetchWoWHeadItem(itemId) {
    return __awaiter(this, void 0, void 0, function () {
        var url, response, data, qualityName;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = "https://nether.wowhead.com/tooltip/item/".concat(itemId, "?dataEnv=4&locale=0");
                    return [4 /*yield*/, fetch(url)];
                case 1:
                    response = _b.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _b.sent();
                    qualityName = [
                        'poor',
                        'common',
                        'uncommon',
                        'rare',
                        'epic',
                        'legendary',
                        'artifact',
                        'heirloom',
                    ][(_a = data.quality) !== null && _a !== void 0 ? _a : 0];
                    return [2 /*return*/, {
                            icon: "https://wow.zamimg.com/images/wow/icons/medium/".concat(data.icon, ".jpg"),
                            quality: data.quality,
                            qualityName: qualityName,
                            name: data.name,
                            id: data.id,
                            tooltip: data.tooltip,
                            spells: data.spells
                        }];
            }
        });
    });
}
function getItemFromDatabase(supabase, itemId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase.from('wow_items')
                        .select('*')
                        .eq('id', itemId)
                        .limit(1)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error('Error fetching item from database:', error);
                        return [2 /*return*/, null];
                    }
                    if (!(data === null || data === void 0 ? void 0 : data.details)) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, { details: data.details, lastUpdated: data.updated_at, displayId: data.displayId, id: data.id }];
            }
        });
    });
}
function saveItemToDatabase(supabase, itemId, itemDetails) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase.from('wow_items')
                        .upsert({ id: itemId, details: itemDetails, display_id: 0, updated_at: new Date() }).select('details')
                        .limit(1)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error('Error saving item to database:', error);
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, data];
            }
        });
    });
}
function fetchNewItem(supabase, token, itemId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, wowHeadItem, bnetDetails, itemDetails, itemIconUrl;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        fetchWoWHeadItem(itemId),
                        fetchItemDetails(token, itemId),
                    ])];
                case 1:
                    _a = _b.sent(), wowHeadItem = _a[0], bnetDetails = _a[1];
                    itemDetails = __assign(__assign(__assign({}, wowHeadItem), bnetDetails), { icon: wowHeadItem.icon });
                    saveItemToDatabase(supabase, itemId, itemDetails).then(); // Don't wait for this to finish
                    itemIconUrl = itemDetails.icon;
                    return [2 /*return*/, ({ itemIconUrl: itemIconUrl, itemDetails: itemDetails })];
            }
        });
    });
}
function getItem(supabase_1, token_1, itemId_1) {
    return __awaiter(this, arguments, void 0, function (supabase, token, itemId, force) {
        var itemFromDatabase, lastUpdated, updatedLessThan3WeeksAgo, itemIconUrl;
        if (force === void 0) { force = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (force) {
                        return [2 /*return*/, fetchNewItem(supabase, token, itemId)];
                    }
                    return [4 /*yield*/, getItemFromDatabase(supabase, itemId)];
                case 1:
                    itemFromDatabase = _a.sent();
                    lastUpdated = itemFromDatabase === null || itemFromDatabase === void 0 ? void 0 : itemFromDatabase.lastUpdated;
                    updatedLessThan3WeeksAgo = ((new Date().getTime() - new Date(lastUpdated).getTime()) < 1000 * 60 * 60 * 24 * 21);
                    if (itemFromDatabase && updatedLessThan3WeeksAgo) {
                        itemIconUrl = itemFromDatabase.details.icon;
                        return [2 /*return*/, ({ itemIconUrl: itemIconUrl, itemDetails: itemFromDatabase.details })];
                    }
                    return [2 /*return*/, fetchNewItem(supabase, token, itemId)];
            }
        });
    });
}
