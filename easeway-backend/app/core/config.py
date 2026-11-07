from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    GOOGLE_MAPS_API_KEY: str
    SUPABASE_DB_URL: str
    SUPABASE_URL: str
    SUPABASE_PUBLISHABLE_KEY: str

settings = Settings()