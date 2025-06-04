import { Component, Input, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import * as am4maps from '@amcharts/amcharts4/maps';
import am4geodata_worldLow from '@amcharts/amcharts4-geodata/worldLow';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';

// Apply theme
am4core.useTheme(am4themes_animated);

@Component({
  selector: 'app-portfolio-dashboard',
  template: `
    <div class="portfolio-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <h2>Portfolio Overview Dashboard</h2>
        <p class="last-updated">Data as of {{currentDate | date:'medium'}}</p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="metric-card">
          <div class="metric-icon">
            <mat-icon>location_city</mat-icon>
          </div>
          <div class="metric-content">
            <h3>{{formatNumber(dashboardData?.summary_metrics?.total_locations)}}</h3>
            <p>Total Locations</p>
          </div>
        </div>

        <div class="metric-card highlight">
          <div class="metric-icon">
            <mat-icon>account_balance</mat-icon>
          </div>
          <div class="metric-content">
            <h3>{{formatCurrency(dashboardData?.summary_metrics?.total_tiv)}}</h3>
            <p>Total Insured Value</p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <mat-icon>public</mat-icon>
          </div>
          <div class="metric-content">
            <h3>{{formatNumber(dashboardData?.summary_metrics?.unique_countries)}}</h3>
            <p>Countries</p>
          </div>
        </div>
      </div>

      <!-- Main Charts Grid -->
      <div class="charts-grid">
        <!-- Geographic Map -->
        <div class="chart-container map-container">
          <h3>Geographic Distribution</h3>
          <div id="geographic-map" class="chart-div"></div>
        </div>

        <!-- Risk Analysis -->
        <div class="chart-container">
          <h3>Natural Hazard Risk Analysis</h3>
          <mat-tab-group>
            <mat-tab label="Earthquake">
              <div id="earthquake-risk-chart" class="chart-div"></div>
            </mat-tab>
            <mat-tab label="Flood">
              <div id="flood-risk-chart" class="chart-div"></div>
            </mat-tab>
            <mat-tab label="Hurricane">
              <div id="hurricane-risk-chart" class="chart-div"></div>
            </mat-tab>
          </mat-tab-group>
        </div>

        <!-- Construction Type -->
        <div class="chart-container">
          <h3>Construction Type Distribution</h3>
          <div id="construction-chart" class="chart-div"></div>
        </div>

        <!-- Property Age -->
        <div class="chart-container">
          <h3>Property Age Distribution</h3>
          <div id="age-chart" class="chart-div"></div>
        </div>

        <!-- Business Units -->
        <div class="chart-container full-width">
          <h3>Business Unit Breakdown</h3>
          <div id="business-unit-chart" class="chart-div"></div>
        </div>
      </div>

      <!-- Data Quality Section -->
      <div class="data-quality-section">
        <h3>Data Quality Metrics</h3>
        <div class="quality-metrics">
          <div class="quality-item">
            <div class="quality-label">Geocoding</div>
            <div class="quality-bar">
              <div class="quality-fill" [style.width.%]="dashboardData?.data_quality_metrics?.geocoding_completeness"></div>
            </div>
            <div class="quality-value">{{dashboardData?.data_quality_metrics?.geocoding_completeness}}%</div>
          </div>

          <div class="quality-item">
            <div class="quality-label">Construction Data</div>
            <div class="quality-bar">
              <div class="quality-fill" [style.width.%]="dashboardData?.data_quality_metrics?.construction_completeness"></div>
            </div>
            <div class="quality-value">{{dashboardData?.data_quality_metrics?.construction_completeness}}%</div>
          </div>

          <div class="quality-item">
            <div class="quality-label">Occupancy Data</div>
            <div class="quality-bar">
              <div class="quality-fill" [style.width.%]="dashboardData?.data_quality_metrics?.occupancy_completeness"></div>
            </div>
            <div class="quality-value">{{dashboardData?.data_quality_metrics?.occupancy_completeness}}%</div>
          </div>

          <div class="quality-item">
            <div class="quality-label">TIV Data</div>
            <div class="quality-bar">
              <div class="quality-fill" [style.width.%]="dashboardData?.data_quality_metrics?.tiv_completeness"></div>
            </div>
            <div class="quality-value">{{dashboardData?.data_quality_metrics?.tiv_completeness}}%</div>
          </div>
        </div>
      </div>

      <!-- High Risk Summary -->
      <div class="risk-summary-section">
        <h3>High Risk Locations Summary</h3>
        <div class="risk-cards">
          <div class="risk-card" *ngFor="let hazard of getHazardTypes()">
            <mat-icon>{{getHazardIcon(hazard.type)}}</mat-icon>
            <div class="risk-content">
              <h4>{{hazard.label}}</h4>
              <p>{{hazard.count}} of {{dashboardData?.hazard_summary?.total_locations}} locations</p>
              <div class="risk-percentage">{{hazard.percentage}}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Country Distribution Table - New Distinct Design -->
      <div class="country-distribution-section">
        <div class="distribution-header">
          <h3>
            <mat-icon>language</mat-icon> 
            Global Value Distribution by Country
          </h3>
          <p class="distribution-subtitle">Total Insured Value (TIV) and Business Interruption Value (BIV) Analysis</p>
        </div>
        
        <div class="distribution-cards">
          <div class="distribution-card" 
              *ngFor="let country of getTopCountries(); let i = index"
              [class.top-three]="i < 3">
            
            <div class="country-rank" *ngIf="i < 3">
              <span class="rank-number">{{i + 1}}</span>
              <mat-icon class="rank-icon">{{getRankIcon(i)}}</mat-icon>
            </div>
            
            <div class="country-header">
              <img [src]="getCountryFlag(country.country)" 
                  [alt]="country.country" 
                  class="country-flag"
                  (error)="onFlagError($event)">
              <div class="country-info">
                <h4>{{getCountryName(country.country)}}</h4>
                <span class="location-count">{{country.location_count}} locations</span>
              </div>
            </div>
            
            <div class="value-grid">
              <div class="value-item tiv">
                <div class="value-label">
                  <mat-icon>security</mat-icon>
                  <span>Total Insured Value</span>
                </div>
                <div class="value-amount">{{country.total_tiv}}</div>
                <div class="value-avg">Avg: {{country.avg_tiv}}</div>
              </div>
              
              <div class="value-item biv">
                <div class="value-label">
                  <mat-icon>business_center</mat-icon>
                  <span>Business Interruption (12mo)</span>
                </div>
                <div class="value-amount">{{country.total_biv_12mo}}</div>
                <div class="value-avg">Avg: {{country.avg_biv_12mo}}</div>
              </div>
            </div>
            
            <div class="ratio-indicator">
              <div class="ratio-bar">
                <div class="ratio-fill" [style.width]="country.biv_to_tiv_ratio"></div>
              </div>
              <div class="ratio-text">
                <span>BIV/TIV Ratio:</span>
                <strong>{{country.biv_to_tiv_ratio}}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Top Locations Table -->
      <div class="top-locations-section">
        <h3>Top 10 Locations by TIV</h3>
        <div class="table-wrapper">
          <table mat-table [dataSource]="topLocationsDataSource" class="locations-table">
            <ng-container matColumnDef="location_name">
              <th mat-header-cell *matHeaderCellDef>Location</th>
              <td mat-cell *matCellDef="let location">{{location.location_name || 'N/A'}}</td>
            </ng-container>

            <ng-container matColumnDef="city">
              <th mat-header-cell *matHeaderCellDef>City</th>
              <td mat-cell *matCellDef="let location">{{location.city}}</td>
            </ng-container>

            <ng-container matColumnDef="state">
              <th mat-header-cell *matHeaderCellDef>State</th>
              <td mat-cell *matCellDef="let location">{{location.state}}</td>
            </ng-container>

            <ng-container matColumnDef="tiv">
              <th mat-header-cell *matHeaderCellDef>TIV</th>
              <td mat-cell *matCellDef="let location">{{location.tiv}}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .portfolio-dashboard {
      width: 100%;
      background: #f5f7fa;
      border-radius: 12px;
      padding: 24px;
    }

    .dashboard-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .dashboard-header h2 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #293340;
    }

    .last-updated {
      color: #666;
      font-size: 14px;
      margin-top: 8px;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    }

    .metric-card.highlight {
      background: linear-gradient(135deg, #2640e8 0%, #1a2cb8 100%);
      color: white;
    }

    .metric-card.highlight .metric-icon {
      background: rgba(255,255,255,0.2);
    }

    .metric-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: #f0f4ff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .metric-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #2640e8;
    }

    .metric-card.highlight .metric-icon mat-icon {
      color: white;
    }

    .metric-content h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .metric-content p {
      margin: 4px 0 0 0;
      font-size: 14px;
      opacity: 0.8;
    }

    /* Charts Grid */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .chart-container {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .chart-container.map-container {
      grid-column: span 2;
    }

    .chart-container.full-width {
      grid-column: 1 / -1;
    }

    .chart-container h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #293340;
    }

    .chart-div {
      width: 100%;
      height: 300px;
    }

    .map-container .chart-div {
      height: 400px;
    }

    /* Data Quality Section */
    .data-quality-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .data-quality-section h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #293340;
    }

    .quality-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .quality-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .quality-label {
      font-size: 14px;
      color: #666;
    }

    .quality-bar {
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }

    .quality-fill {
      height: 100%;
      background: linear-gradient(90deg, #4caf50 0%, #2e7d32 100%);
      border-radius: 4px;
      transition: width 0.6s ease;
    }

    .quality-value {
      font-size: 14px;
      font-weight: 600;
      color: #293340;
      text-align: right;
    }

    /* Risk Summary */
    .risk-summary-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .risk-summary-section h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #293340;
    }

    .risk-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .risk-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #fff5f5;
      border-radius: 8px;
      border: 1px solid #ffcdd2;
    }

    .risk-card mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #f44336;
    }

    .risk-content h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #293340;
    }

    .risk-content p {
      margin: 4px 0;
      font-size: 12px;
      color: #666;
    }

    .risk-percentage {
      font-size: 18px;
      font-weight: 600;
      color: #f44336;
    }

    /* Top Locations Table */
    .top-locations-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .top-locations-section h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #293340;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .locations-table {
      width: 100%;
      background: transparent;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }

      .chart-container.map-container {
        grid-column: span 1;
      }

      .summary-cards {
        grid-template-columns: 1fr 1fr;
      }
    }
    /* Country Distribution Section - Distinct & Attractive Design */
.country-distribution-section {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  position: relative;
  overflow: hidden;
}

.country-distribution-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #2640e8 0%, #1a2cb8 50%, #0f1d94 100%);
}

.distribution-header {
  text-align: center;
  margin-bottom: 32px;
}

.distribution-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #293340;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.distribution-header h3 mat-icon {
  font-size: 28px;
  width: 28px;
  height: 28px;
  color: #2640e8;
}

.distribution-subtitle {
  margin: 8px 0 0 0;
  color: #666;
  font-size: 14px;
}

.distribution-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
}

.distribution-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  position: relative;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.distribution-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  border-color: #e0e7ff;
}

.distribution-card.top-three {
  background: linear-gradient(135deg, #f0f4ff 0%, #e8efff 100%);
  border-color: #d0ddff;
}

.country-rank {
  position: absolute;
  top: -12px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.rank-number {
  font-size: 18px;
  font-weight: 700;
  color: #2640e8;
}

.rank-icon {
  font-size: 20px;
  width: 20px;
  height: 20px;
}

.country-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.country-flag {
  width: 48px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.country-info h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #293340;
}

.location-count {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.value-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.value-item {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.value-item.tiv {
  border-left: 4px solid #2640e8;
}

.value-item.biv {
  border-left: 4px solid #4caf50;
}

.value-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.value-label mat-icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

.value-label span {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.value-amount {
  font-size: 18px;
  font-weight: 700;
  color: #293340;
  margin-bottom: 4px;
}

.value-avg {
  font-size: 11px;
  color: #999;
}

.ratio-indicator {
  background: white;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.ratio-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.ratio-fill {
  height: 100%;
  background: linear-gradient(90deg, #2640e8 0%, #4caf50 100%);
  border-radius: 4px;
  transition: width 0.6s ease;
}

.ratio-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.ratio-text span {
  color: #666;
}

.ratio-text strong {
  color: #293340;
  font-weight: 600;
}
  `]
})
export class PortfolioDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() dashboardData: any;
  @Input() currencySymbol = '$';

  currentDate = new Date();
  topLocationsDataSource: any[] = [];
  displayedColumns = ['location_name', 'city', 'state', 'tiv'];

  private charts: any[] = [];

  ngOnInit(): void {
    if (this.dashboardData?.top_locations) {
      this.topLocationsDataSource = this.dashboardData.top_locations.slice(0, 10);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.createAllCharts();
    }, 100);
  }

  ngOnDestroy(): void {
    // Dispose all charts
    this.charts.forEach(chart => {
      if (chart) {
        chart.dispose();
      }
    });
  }

  createAllCharts(): void {
    if (!this.dashboardData) return;

    // Create all visualizations
    this.createGeographicMap();
    this.createRiskCharts();
    this.createConstructionChart();
    this.createAgeChart();
    this.createBusinessUnitChart();
  }

  createGeographicMap(): void {
    const mapData = this.dashboardData?.geographic_distribution || [];
    if (mapData.length === 0) return;

    const chart = am4core.create("geographic-map", am4maps.MapChart);
    this.charts.push(chart);

    chart.geodata = am4geodata_worldLow;
    chart.projection = new am4maps.projections.Miller();

    // Background map
    const polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
    polygonSeries.useGeodata = true;
    polygonSeries.mapPolygons.template.fill = am4core.color("#e0e0e0");
    polygonSeries.mapPolygons.template.stroke = am4core.color("#ffffff");

    // Points for locations
    const pointSeries = chart.series.push(new am4maps.MapImageSeries());
    
    const imageTemplate = pointSeries.mapImages.template;
    imageTemplate.propertyFields.latitude = "latitude";
    imageTemplate.propertyFields.longitude = "longitude";
    
    const circle = imageTemplate.createChild(am4core.Circle);
    circle.radius = 4;
    circle.propertyFields.fill = "color";
    circle.tooltipText = "{location_name}\n{city}, {state}\nTIV: {tiv}\nRisk: {overall_risk}";

    // Process map data
    const processedData = mapData.map((location: any) => ({
      ...location,
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude),
      color: this.getRiskColor(location.overall_risk)
    }));

    pointSeries.data = processedData;

    // Zoom controls
    chart.zoomControl = new am4maps.ZoomControl();
  }

  createRiskCharts(): void {
    // Create earthquake risk chart
    this.createRiskPieChart('earthquake-risk-chart', this.dashboardData?.risk_analysis?.earthquake || []);
    
    // Create flood risk chart
    this.createRiskPieChart('flood-risk-chart', this.dashboardData?.risk_analysis?.flood || []);
    
    // Create hurricane risk chart
    this.createRiskPieChart('hurricane-risk-chart', this.dashboardData?.risk_analysis?.hurricane || []);
  }

  createRiskPieChart(elementId: string, data: any[]): void {
    if (!data || data.length === 0) return;

    const chart = am4core.create(elementId, am4charts.PieChart);
    this.charts.push(chart);

    const pieSeries = chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = "location_count";
    pieSeries.dataFields.category = "risk_level";
    
    // Custom colors for risk levels
    pieSeries.slices.template.propertyFields.fill = "color";

    pieSeries.slices.template.tooltipText = "{category}: {location_count} locations\nTIV: {tiv_formatted}";
    
    // Process data with colors
    chart.data = data.map(item => ({
      ...item,
      color: this.getRiskLevelColor(item.risk_level),
      tiv_formatted: this.formatCurrency(item.total_tiv)
    }));

    pieSeries.labels.template.disabled = true;
    pieSeries.ticks.template.disabled = true;
    
    // Add legend
    chart.legend = new am4charts.Legend();
    chart.legend.position = "right";
    chart.legend.fontSize = 12;
  }

  createConstructionChart(): void {
    const data = this.dashboardData?.construction_breakdown || [];
    if (data.length === 0) return;

    const chart = am4core.create("construction-chart", am4charts.XYChart);
    this.charts.push(chart);

   chart.data = data.slice(0, 8).map((item: { total_tiv: any; }) => ({
      ...item,
      tiv_formatted: this.formatCurrency(item.total_tiv)
    }));

    

    const categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = "construction_type";
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.labels.template.rotation = -45;
    categoryAxis.renderer.labels.template.horizontalCenter = "right";
    categoryAxis.renderer.labels.template.verticalCenter = "middle";

    const valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.title.text = "Total Insured Value";

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.columns.template.tooltipText = "{categoryX}\nLocations: {location_count}\nTIV: [bold]{tiv_formatted}[/]";
    series.dataFields.valueY = "total_tiv";
    series.dataFields.categoryX = "construction_type";
    series.columns.template.fill = am4core.color("#2640e8");
    series.columns.template.strokeWidth = 0;
    series.columns.template.tooltipText = "{categoryX}: {valueY}";
  }

  createAgeChart(): void {
    const data = this.dashboardData?.age_distribution || [];
    if (data.length === 0) return;

    const chart = am4core.create("age-chart", am4charts.XYChart);
    this.charts.push(chart);

    chart.data = data;

    const categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = "age_group";
    categoryAxis.renderer.grid.template.location = 0;

    const valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.title.text = "Number of Locations";

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = "location_count";
    series.dataFields.categoryX = "age_group";
    series.columns.template.fill = am4core.color("#4caf50");
    series.columns.template.strokeWidth = 0;
    series.columns.template.tooltipText = "{categoryX}: {valueY} locations\nTIV: {total_tiv}";
  }

  createBusinessUnitChart(): void {
    const data = this.dashboardData?.business_unit_breakdown || [];
    if (data.length === 0) return;

    const chart = am4core.create("business-unit-chart", am4charts.XYChart);
    this.charts.push(chart);

    chart.data = data.slice(0, 10); // Top 10 business units

    const categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = "business_unit";
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.inversed = true;

    const valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
    valueAxis.title.text = "Total Insured Value";

    // Create series for different value types
    const createSeries = (field: string, name: string, color: string) => {
      const series = chart.series.push(new am4charts.ColumnSeries());
      series.dataFields.valueX = field;
      series.dataFields.categoryY = "business_unit";
      series.name = name;
      series.columns.template.fill = am4core.color(color);
      series.columns.template.strokeWidth = 0;
      series.stacked = true;
      series.columns.template.tooltipText = "{name}: {valueX}";
      return series;
    };

    createSeries("building_value", "Building", "#2640e8");
    createSeries("content_value", "Contents", "#4caf50");
    createSeries("bi_value", "Business Interruption", "#ff9800");

    chart.legend = new am4charts.Legend();
    chart.legend.position = "bottom";
  }

  // Helper methods
  formatNumber(value: any): string {
    if (!value) return '0';
    return value.toLocaleString();
  }

  getRiskColor(risk: string): am4core.Color {
    switch (risk?.toLowerCase()) {
      case 'high':
        return am4core.color("#f44336");
      case 'medium':
        return am4core.color("#ff9800");
      case 'low':
        return am4core.color("#4caf50");
      default:
        return am4core.color("#9e9e9e");
    }
  }

  getRiskLevelColor(level: string): am4core.Color {
    switch (level?.toLowerCase()) {
      case 'high':
        return am4core.color("#f44336");
      case 'medium':
        return am4core.color("#ff9800");
      case 'low':
        return am4core.color("#4caf50");
      default:
        return am4core.color("#9e9e9e");
    }
  }

  getHazardTypes(): any[] {
    const hazardSummary = this.dashboardData?.hazard_summary || {};
    const total = hazardSummary.total_locations || 1;

    return [
      {
        type: 'earthquake',
        label: 'Earthquake',
        count: hazardSummary.high_earthquake_risk || 0,
        percentage: ((hazardSummary.high_earthquake_risk || 0) / total * 100).toFixed(1)
      },
      {
        type: 'flood',
        label: 'Flood',
        count: (hazardSummary.high_river_flood_risk || 0) + (hazardSummary.high_flash_flood_risk || 0),
        percentage: (((hazardSummary.high_river_flood_risk || 0) + (hazardSummary.high_flash_flood_risk || 0)) / total * 100).toFixed(1)
      },
      {
        type: 'hurricane',
        label: 'Hurricane',
        count: hazardSummary.high_hurricane_risk || 0,
        percentage: ((hazardSummary.high_hurricane_risk || 0) / total * 100).toFixed(1)
      },
      {
        type: 'wildfire',
        label: 'Wildfire',
        count: hazardSummary.high_wildfire_risk || 0,
        percentage: ((hazardSummary.high_wildfire_risk || 0) / total * 100).toFixed(1)
      }
    ];
  }

  getHazardIcon(type: string): string {
    const iconMap: {[key: string]: string} = {
      'earthquake': 'terrain',
      'flood': 'water_damage',
      'hurricane': 'storm',
      'wildfire': 'local_fire_department'
    };
    return iconMap[type] || 'warning';
  }

  formatCurrency(value: any): string {
  if (!value || typeof value !== 'string') return '0';
  
  // Extract numeric value from formatted currency string
  const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  
  if (isNaN(numericValue)) return value;
  
  // Format based on size
  if (numericValue >= 1e9) {
    return this.currencySymbol + (numericValue / 1e9).toFixed(1) + 'B';
  } else if (numericValue >= 1e6) {
    return this.currencySymbol + (numericValue / 1e6).toFixed(1) + 'M';
  } else if (numericValue >= 1e3) {
    return this.currencySymbol + (numericValue / 1e3).toFixed(1) + 'K';
  } else {
    return this.currencySymbol + numericValue.toFixed(0);
  }
}

getTopCountries(): any[] {
  return this.dashboardData?.country_distribution || [];
}

getRankIcon(index: number): string {
  const icons = ['emoji_events', 'military_tech', 'grade'];
  return icons[index] || 'star';
}

getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return 'assets/flags/default.png';
  }
  return `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;
}

onFlagError(event: any): void {
  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSIzNiIgdmlld0JveD0iMCAwIDQ4IDM2Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iMzYiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSI+RmxhZzwvdGV4dD48L3N2Zz4=';
}

getCountryName(countryCode: string): string {
  const countryNames: {[key: string]: string} = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'CN': 'China',
    'IN': 'India',
    'BR': 'Brazil',
    'MX': 'Mexico',
    // Add more country mappings as needed
  };
  
  return countryNames[countryCode] || countryCode;
}
}