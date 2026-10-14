from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    GOOGLE_MAPS_API_KEY: str
    SUPABASE_URL: str
    SUPBASE_KEY: str

settings = Settings()