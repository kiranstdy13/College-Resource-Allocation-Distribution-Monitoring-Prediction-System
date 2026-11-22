import json
import os
import atexit
from datetime import datetime
import pymongo
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from config import Config

_client = None
_db = None
_is_mock = False

PERSIST_FILE = os.path.join(os.path.dirname(__file__), "data", "mock_db_store.json")

def _json_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

def save_mock_data():
    global _db, _is_mock
    if not _is_mock or _db is None:
        return
    try:
        dump = {}
        for coll_name in _db.list_collection_names():
            docs = list(_db[coll_name].find())
            # convert ObjectIds / datetimes for JSON
            cleaned_docs = []
            for d in docs:
                item = dict(d)
                if "_id" in item:
                    item["_id"] = str(item["_id"])
                for k, v in item.items():
                    if isinstance(v, datetime):
                        item[k] = v.isoformat()
                cleaned_docs.append(item)
            dump[coll_name] = cleaned_docs
        os.makedirs(os.path.dirname(PERSIST_FILE), exist_ok=True)
        with open(PERSIST_FILE, "w", encoding="utf-8") as f:
            json.dump(dump, f, indent=2, default=_json_serializer)
    except Exception as e:
        print(f"[DB] Warning saving mock data: {e}")

def load_mock_data():
    global _db
    if not os.path.exists(PERSIST_FILE):
        return
    try:
        with open(PERSIST_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        for coll_name, docs in data.items():
            if docs:
                _db[coll_name].delete_many({})
                _db[coll_name].insert_many(docs)
        print(f"[DB] Loaded persisted state from {PERSIST_FILE}")
    except Exception as e:
        print(f"[DB] Warning loading persisted mock data: {e}")

def get_db():
    global _client, _db, _is_mock
    if _db is not None:
        return _db

    # Try connecting to real MongoDB first
    try:
        print(f"[DB] Connecting to MongoDB at {Config.MONGO_URI}...")
        client = pymongo.MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=1200)
        # Check connection
        client.admin.command("ping")
        _client = client
        _db = client[Config.DB_NAME]
        _is_mock = False
        print(f"[DB] Connected successfully to real MongoDB: {Config.DB_NAME}")
        _create_indexes(_db)
        return _db
    except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
        print(f"[DB] Real MongoDB not reachable: {e}")
        if Config.USE_MOCK_IF_NO_MONGO:
            import mongomock
            print("[DB] Initializing embedded mongomock fallback...")
            _client = mongomock.MongoClient()
            _db = _client[Config.DB_NAME]
            _is_mock = True
            load_mock_data()
            atexit.register(save_mock_data)
            return _db
        else:
            raise

def _create_indexes(db):
    try:
        db.users.create_index("email", unique=True)
        db.departments.create_index("dept_id", unique=True)
        db.resources.create_index("resource_id", unique=True)
        db.distribution_cycles.create_index("cycle_code", unique=True)
        db.resource_requests.create_index([("department_id", 1), ("cycle_id", 1)])
        db.department_inventory.create_index([("department_id", 1), ("resource_id", 1)], unique=True)
        db.resource_assets.create_index("asset_id", unique=True)
    except Exception as e:
        print(f"[DB] Note on index creation: {e}")

# Helper to sync mock if running in mock mode
def sync_db():
    if _is_mock:
        save_mock_data()
