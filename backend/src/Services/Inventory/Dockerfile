FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Shared/Profitzen.Common/Profitzen.Common.csproj", "src/Shared/Profitzen.Common/"]
COPY ["src/Services/Inventory/Profitzen.Inventory.csproj", "src/Services/Inventory/"]
RUN dotnet restore "src/Services/Inventory/Profitzen.Inventory.csproj"
COPY . .
WORKDIR "/src/src/Services/Inventory"
RUN dotnet build "Profitzen.Inventory.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Profitzen.Inventory.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Profitzen.Inventory.dll"]
