<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>freguesias</Name>
    <UserStyle>
      <Title>Freguesias de Viana do Castelo</Title>
      <Abstract>Contorno dos limites de freguesia com etiqueta (nome).</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <Name>contorno</Name>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#3b82f6</CssParameter>
              <CssParameter name="fill-opacity">0.05</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#1d4ed8</CssParameter>
              <CssParameter name="stroke-width">1.2</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>etiqueta</Name>
          <MaxScaleDenominator>150000</MaxScaleDenominator>
          <TextSymbolizer>
            <Label>
              <ogc:PropertyName>freguesia</ogc:PropertyName>
            </Label>
            <Font>
              <CssParameter name="font-family">Open Sans</CssParameter>
              <CssParameter name="font-size">11</CssParameter>
              <CssParameter name="font-weight">bold</CssParameter>
            </Font>
            <LabelPlacement>
              <PointPlacement>
                <AnchorPoint>
                  <AnchorPointX>0.5</AnchorPointX>
                  <AnchorPointY>0.5</AnchorPointY>
                </AnchorPoint>
              </PointPlacement>
            </LabelPlacement>
            <Halo>
              <Radius>1.5</Radius>
              <Fill>
                <CssParameter name="fill">#ffffff</CssParameter>
                <CssParameter name="fill-opacity">0.85</CssParameter>
              </Fill>
            </Halo>
            <Fill>
              <CssParameter name="fill">#0f172a</CssParameter>
            </Fill>
            <VendorOption name="autoWrap">60</VendorOption>
            <VendorOption name="maxDisplacement">40</VendorOption>
            <VendorOption name="goodnessOfFit">0.5</VendorOption>
          </TextSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
