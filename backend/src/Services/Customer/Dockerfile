FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Shared/Profitzen.Common/Profitzen.Common.csproj", "src/Shared/Profitzen.Common/"]
COPY ["src/Services/Customer/Profitzen.Customer.csproj", "src/Services/Customer/"]
RUN dotnet restore "src/Services/Customer/Profitzen.Customer.csproj"
COPY . .
WORKDIR "/src/src/Services/Customer"
RUN dotnet build "Profitzen.Customer.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Profitzen.Customer.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Profitzen.Customer.dll"]
