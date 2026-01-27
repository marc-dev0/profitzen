FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Shared/Profitzen.Common/Profitzen.Common.csproj", "src/Shared/Profitzen.Common/"]
COPY ["src/Services/Sales/Profitzen.Sales.csproj", "src/Services/Sales/"]
RUN dotnet restore "src/Services/Sales/Profitzen.Sales.csproj"
COPY . .
WORKDIR "/src/src/Services/Sales"
RUN dotnet build "Profitzen.Sales.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Profitzen.Sales.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Profitzen.Sales.dll"]
