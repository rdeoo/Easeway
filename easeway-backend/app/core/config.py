from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    GOOGLE_MAPS_API_KEY: str
    DATABASE_URL: str

settings = Settings()