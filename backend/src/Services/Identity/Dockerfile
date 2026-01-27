FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["src/Shared/Profitzen.Common/Profitzen.Common.csproj", "src/Shared/Profitzen.Common/"]
COPY ["src/Services/Identity/Profitzen.Identity.csproj", "src/Services/Identity/"]
RUN dotnet restore "src/Services/Identity/Profitzen.Identity.csproj"
COPY . .
WORKDIR "/src/src/Services/Identity"
RUN dotnet build "Profitzen.Identity.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Profitzen.Identity.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Profitzen.Identity.dll"]
