<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>alojamento_local</Name>
    <UserStyle>
      <Title>Alojamento Local por modalidade</Title>
      <FeatureTypeStyle>
        <Rule>
          <Title>Estabelecimento de hospedagem</Title>
          <ogc:Filter><ogc:PropertyIsEqualTo>
            <ogc:PropertyName>modalidade</ogc:PropertyName>
            <ogc:Literal>Estabelecimento de hospedagem</ogc:Literal>
          </ogc:PropertyIsEqualTo></ogc:Filter>
          <PointSymbolizer><Graphic>
            <Mark><WellKnownName>circle</WellKnownName>
              <Fill><CssParameter name="fill">#1f77b4</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#ffffff</CssParameter><CssParameter name="stroke-width">1</CssParameter></Stroke>
            </Mark><Size>9</Size>
          </Graphic></PointSymbolizer>
        </Rule>
        <Rule>
          <Title>Apartamento</Title>
          <ogc:Filter><ogc:PropertyIsEqualTo>
            <ogc:PropertyName>modalidade</ogc:PropertyName>
            <ogc:Literal>Apartamento</ogc:Literal>
          </ogc:PropertyIsEqualTo></ogc:Filter>
          <PointSymbolizer><Graphic>
            <Mark><WellKnownName>circle</WellKnownName>
              <Fill><CssParameter name="fill">#ff7f0e</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#ffffff</CssParameter><CssParameter name="stroke-width">1</CssParameter></Stroke>
            </Mark><Size>9</Size>
          </Graphic></PointSymbolizer>
        </Rule>
        <Rule>
          <Title>Moradia</Title>
          <ogc:Filter><ogc:PropertyIsEqualTo>
            <ogc:PropertyName>modalidade</ogc:PropertyName>
            <ogc:Literal>Moradia</ogc:Literal>
          </ogc:PropertyIsEqualTo></ogc:Filter>
          <PointSymbolizer><Graphic>
            <Mark><WellKnownName>circle</WellKnownName>
              <Fill><CssParameter name="fill">#2ca02c</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#ffffff</CssParameter><CssParameter name="stroke-width">1</CssParameter></Stroke>
            </Mark><Size>9</Size>
          </Graphic></PointSymbolizer>
        </Rule>
        <Rule>
          <Title>Quartos</Title>
          <ogc:Filter><ogc:PropertyIsEqualTo>
            <ogc:PropertyName>modalidade</ogc:PropertyName>
            <ogc:Literal>Quartos</ogc:Literal>
          </ogc:PropertyIsEqualTo></ogc:Filter>
          <PointSymbolizer><Graphic>
            <Mark><WellKnownName>circle</WellKnownName>
              <Fill><CssParameter name="fill">#9467bd</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#ffffff</CssParameter><CssParameter name="stroke-width">1</CssParameter></Stroke>
            </Mark><Size>9</Size>
          </Graphic></PointSymbolizer>
        </Rule>
        <Rule>
          <Title>Outras modalidades</Title>
          <ElseFilter/>
          <PointSymbolizer><Graphic>
            <Mark><WellKnownName>circle</WellKnownName>
              <Fill><CssParameter name="fill">#7f7f7f</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#ffffff</CssParameter><CssParameter name="stroke-width">1</CssParameter></Stroke>
            </Mark><Size>8</Size>
          </Graphic></PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
